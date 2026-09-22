import { buildCookieString, hashPassword, parseCookieHeader, signSession, verifyPassword, verifySession } from './lib/auth.js';
import { getSupabaseClient } from './lib/supabase.js';

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getSessionOrThrow(request: Request) {
  const sessionToken = parseCookieHeader(request.headers.get('cookie')).session;
  const session = sessionToken ? verifySession(sessionToken) : null;

  if (!session) {
    throw new Error('Sessão não autenticada.');
  }

  return session;
}

function getRequestPath(request: Request): string {
  const pathname = new URL(request.url).pathname;
  return pathname.replace(/\/+$/, '') || '/api';
}

async function getJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function handleSession(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ error: 'Método não permitido' }, 405);
  }

  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const session = cookies.session ? verifySession(cookies.session) : null;

  return json({
    user: session ? { id: session.id, isAdmin: session.isAdmin } : null,
  });
}

async function handleLogin(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  const body = await getJsonBody(request);
  if (!body) {
    return json({ error: 'Corpo da requisição inválido' }, 400);
  }

  const id = String(body.id ?? '').trim();
  const password = String(body.password ?? '');

  if (!id || !password) {
    return json({ error: 'Preencha ID e senha.' }, 400);
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('members')
      .select('id, id_jogo, is_admin, senha_hash, senha_salt')
      .eq('id_jogo', id)
      .maybeSingle();

    if (error || !data) {
      return json({ error: 'Credencial inválida.' }, 401);
    }

    const validPassword = verifyPassword(password, data.senha_hash, data.senha_salt);
    if (!validPassword) {
      return json({ error: 'Credencial inválida.' }, 401);
    }

    const token = signSession({
      id: data.id,
      idJogo: data.id_jogo,
      isAdmin: Boolean(data.is_admin),
    });

    const cookie = buildCookieString('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return new Response(JSON.stringify({ user: { id: data.id, isAdmin: Boolean(data.is_admin) } }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
  } catch (error) {
    console.error('Erro de autenticação:', error);
    return json({ error: 'Erro interno de autenticação.' }, 500);
  }
}

async function handleLogout(request: Request): Promise<Response> {
  if (request.method !== 'POST' && request.method !== 'GET') {
    return json({ ok: false, error: 'Método não permitido' }, 405);
  }

  const cleared = 'session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax';
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cleared,
    },
  });
}

async function handleRegister(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  const body = await getJsonBody(request);
  if (!body) {
    return json({ error: 'Corpo da requisição inválido' }, 400);
  }

  const nome = String(body.nome ?? '').trim();
  const sobrenome = String(body.sobrenome ?? '').trim();
  const discordId = String(body.discordId ?? body.discord_id ?? body.rgDiscord ?? body.rg_discord ?? '').trim();
  const idJogo = String(body.idJogo ?? body.id_jogo ?? body.idMilitar ?? body.id_militar ?? '').trim();
  const senha = String(body.senha ?? body.password ?? '');

  if (!nome || !sobrenome || !discordId || !idJogo || !senha) {
    return json({ error: 'Preencha nome, sobrenome, RG Discord, ID Militar e senha.' }, 400);
  }

  const client = getSupabaseClient();
  const [existingMembers, existingPending] = await Promise.all([
    client.from('members').select('id').or(`id_jogo.eq.${idJogo},discord_id.eq.${discordId}`),
    client.from('pending_registrations').select('id').or(`id_jogo.eq.${idJogo},discord_id.eq.${discordId}`),
  ]);

  if (existingMembers.error || existingPending.error) {
    return json({ error: 'Não foi possível validar o cadastro.' }, 500);
  }

  if ((existingMembers.data ?? []).length > 0 || (existingPending.data ?? []).length > 0) {
    return json({ error: 'ID Militar ou RG Discord já cadastrado.' }, 409);
  }

  const { hash, salt } = hashPassword(senha);
  const { data, error } = await client
    .from('pending_registrations')
    .insert({
      nome,
      sobrenome,
      discord_id: discordId,
      id_jogo: idJogo,
      senha_hash: hash,
      senha_salt: salt,
    })
    .select('id, nome, sobrenome, id_jogo, discord_id')
    .single();

  if (error || !data) {
    console.error('Erro ao salvar cadastro pendente:', error);
    return json({ error: 'Erro ao salvar no banco de dados.' }, 500);
  }

  return json({ ok: true, pending: data }, 201);
}

function normalizeMember(member: Record<string, unknown>) {
  return {
    id: String(member.id),
    nome: String(member.nome ?? ''),
    sobrenome: String(member.sobrenome ?? ''),
    idJogo: String(member.id_jogo ?? ''),
    patente: String(member.patente ?? 'Soldado'),
    funcao: String(member.funcao ?? 'Operador'),
    status: (member.status as 'ATIVO' | 'INATIVO') ?? 'ATIVO',
    horasPatrulha: Number(member.horas_patrulha ?? 0),
    apreensoesRs: Number(member.apreensoes_rs ?? 0),
  };
}

async function handleMembers(request: Request): Promise<Response> {
  try {
    const session = getSessionOrThrow(request);

    if (request.method === 'GET') {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('members')
        .select('id, nome, sobrenome, id_jogo, discord_id, patente, funcao, status, horas_patrulha, apreensoes_rs, is_admin')
        .order('nome', { ascending: true });

      if (error) {
        return json({ error: 'Não foi possível listar membros.' }, 500);
      }

      const rows = (data ?? []) as Record<string, unknown>[];
      const members = rows.map((member: Record<string, unknown>) => {
        const normalized = normalizeMember(member);

        if (!session.isAdmin) {
          return {
            ...normalized,
            discordId: undefined,
            isAdmin: undefined,
          };
        }

        return {
          ...normalized,
          discordId: String(member.discord_id ?? ''),
          isAdmin: Boolean(member.is_admin),
        };
      });

      return json({ members });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Método não permitido' }, 405);
    }

    if (!session.isAdmin) {
      return json({ error: 'Acesso restrito ao comando.' }, 403);
    }

    const body = await getJsonBody(request);
    if (!body) {
      return json({ error: 'Corpo inválido.' }, 400);
    }

    const action = String(body.action ?? '');
    const client = getSupabaseClient();

    if (action === 'update') {
      const id = String(body.id ?? '');
      const patch = { ...body };
      delete patch.action;
      delete patch.id;

      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(patch)) {
        const dbKey = key === 'idJogo' ? 'id_jogo' : key === 'discordId' ? 'discord_id' : key === 'horasPatrulha' ? 'horas_patrulha' : key === 'apreensoesRs' ? 'apreensoes_rs' : key === 'isAdmin' ? 'is_admin' : key;
        payload[dbKey] = value;
      }

      const { error } = await client.from('members').update(payload).eq('id', id);
      if (error) {
        return json({ error: 'Não foi possível atualizar o membro.' }, 500);
      }

      return json({ ok: true });
    }

    if (action === 'delete') {
      const id = String(body.id ?? '');
      if (!id) {
        return json({ error: 'ID do membro obrigatório.' }, 400);
      }

      const { error } = await client.from('members').delete().eq('id', id);
      if (error) {
        return json({ error: 'Não foi possível remover o membro.' }, 500);
      }

      return json({ ok: true });
    }

    if (action === 'reset-accounting') {
      const { error } = await client.from('members').update({ horas_patrulha: 0, apreensoes_rs: 0 }).neq('id', '');
      if (error) {
        return json({ error: 'Não foi possível resetar contabilidade.' }, 500);
      }

      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch {
    return json({ error: 'Sessão não autenticada.' }, 401);
  }
}

async function handlePending(request: Request): Promise<Response> {
  try {
    const session = getSessionOrThrow(request);
    if (!session.isAdmin) {
      return json({ error: 'Acesso restrito ao comando.' }, 403);
    }

    if (request.method === 'GET') {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('pending_registrations')
        .select('id, nome, sobrenome, id_jogo, discord_id, senha_hash, senha_salt, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        return json({ error: 'Não foi possível carregar solicitações.' }, 500);
      }

      const rows = (data ?? []) as Record<string, unknown>[];
      const pending = rows.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        nome: String(item.nome),
        sobrenome: String(item.sobrenome),
        rgDiscord: String(item.discord_id),
        idMilitar: String(item.id_jogo),
        senha: '',
        dataSolicitacao: item.created_at ? new Date(String(item.created_at)).toISOString() : new Date().toISOString(),
      }));

      return json({ pending });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Método não permitido' }, 405);
    }

    const body = await getJsonBody(request);
    if (!body) {
      return json({ error: 'Corpo inválido.' }, 400);
    }

    const client = getSupabaseClient();
    const action = String(body.action ?? '');
    const id = String(body.id ?? '');

    if (!id) {
      return json({ error: 'ID da solicitação obrigatório.' }, 400);
    }

    const pendingItem = await client
      .from('pending_registrations')
      .select('id, nome, sobrenome, id_jogo, discord_id, senha_hash, senha_salt')
      .eq('id', id)
      .maybeSingle();

    if (pendingItem.error) {
      return json({ error: 'Solicitação não encontrada.' }, 404);
    }

    if (!pendingItem.data) {
      return json({ error: 'Solicitação não encontrada.' }, 404);
    }

    if (action === 'deny') {
      const { error } = await client.from('pending_registrations').delete().eq('id', id);
      return json({ ok: !error, error: error ? 'Não foi possível rejeitar a solicitação.' : undefined }, error ? 500 : 200);
    }

    if (action === 'approve') {
      const memberPayload = {
        nome: pendingItem.data.nome,
        sobrenome: pendingItem.data.sobrenome,
        id_jogo: pendingItem.data.id_jogo,
        discord_id: pendingItem.data.discord_id,
        patente: 'Soldado',
        funcao: 'Operador',
        status: 'ATIVO',
        horas_patrulha: 0,
        apreensoes_rs: 0,
        is_admin: false,
        senha_hash: pendingItem.data.senha_hash,
        senha_salt: pendingItem.data.senha_salt,
      };

      const { error: insertError } = await client.from('members').insert(memberPayload);
      if (insertError) {
        return json({ error: 'Não foi possível aprovar a solicitação.' }, 500);
      }

      const { error: deleteError } = await client.from('pending_registrations').delete().eq('id', id);
      if (deleteError) {
        return json({ error: 'Solicitação aprovada, mas não foi possível remover o registro pendente.' }, 500);
      }

      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch {
    return json({ error: 'Sessão não autenticada.' }, 401);
  }
}

async function handleRso(request: Request): Promise<Response> {
  try {
    const session = getSessionOrThrow(request);

    if (request.method === 'GET') {
      const client = getSupabaseClient();
      const { data, error } = await client.from('rso_reports').select('*').order('created_at', { ascending: false });
      if (error) {
        return json({ error: 'Não foi possível carregar relatórios.' }, 500);
      }

      const rows = (data ?? []) as Record<string, unknown>[];
      const reports = rows.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        patrolId: item.patrol_id ? String(item.patrol_id) : undefined,
        enviadoPor: String(item.enviado_por),
        idMilitar: String(item.id_militar),
        viatura: String(item.viatura),
        barca: item.barca ?? {},
        ocorrencias: Number(item.ocorrencias ?? 0),
        detidos: Number(item.detidos ?? 0),
        armamento: Number(item.armamento ?? 0),
        drogas: Number(item.drogas ?? 0),
        municoes: Number(item.municoes ?? 0),
        bombas: Number(item.bombas ?? 0),
        dinheiroMarcado: Number(item.dinheiro_marcado ?? 0),
        resumo: String(item.resumo ?? ''),
        dataEnvio: item.created_at ? new Date(String(item.created_at)).toISOString() : new Date().toISOString(),
        status: String(item.status ?? 'pending') as 'pending' | 'validated' | 'rejected',
      }));

      return json({ reports, session: { id: session.id, isAdmin: session.isAdmin } });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Método não permitido' }, 405);
    }

    const body = await getJsonBody(request);
    if (!body) {
      return json({ error: 'Corpo inválido.' }, 400);
    }

    const client = getSupabaseClient();
    const action = String(body.action ?? '');

    if (action === 'create') {
      const barca = typeof body.barca === 'object' && body.barca ? (body.barca as Record<string, unknown>) : {};
      const patrolId = body.patrolId ? String(body.patrolId) : null;

      const { data, error } = await client.from('rso_reports').insert({
        enviado_por: session.idJogo,
        id_militar: session.idJogo,
        viatura: String(body.viatura as string ?? ''),
        patrol_id: patrolId,
        barca,
        ocorrencias: Number(body.ocorrencias ?? 0),
        detidos: Number(body.detidos ?? 0),
        armamento: Number(body.armamento ?? 0),
        drogas: Number(body.drogas ?? 0),
        municoes: Number(body.municoes ?? 0),
        bombas: Number(body.bombas ?? 0),
        dinheiro_marcado: Number(body.dinheiroMarcado ?? 0),
        resumo: String(body.resumo ?? ''),
        status: 'pending',
      }).select('id').single();

      if (error || !data) {
        return json({ error: 'Não foi possível criar o relatório.' }, 500);
      }

      return json({ ok: true, id: data.id }, 201);
    }

    if (action === 'validate' || action === 'reject') {
      const id = String(body.id ?? '');
      if (!id) {
        return json({ error: 'ID do relatório obrigatório.' }, 400);
      }

      const status = action === 'validate' ? 'validated' : 'rejected';
      const { error } = await client.from('rso_reports').update({ status }).eq('id', id);
      if (error) {
        return json({ error: 'Não foi possível atualizar o relatório.' }, 500);
      }

      return json({ ok: true });
    }

    if (action === 'reset') {
      const { error } = await client.from('rso_reports').delete().neq('id', '');
      if (error) {
        return json({ error: 'Não foi possível resetar relatórios.' }, 500);
      }
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch {
    return json({ error: 'Sessão não autenticada.' }, 401);
  }
}

async function handlePatrols(request: Request): Promise<Response> {
  const sessionToken = parseCookieHeader(request.headers.get('cookie')).session;
  const session = sessionToken ? verifySession(sessionToken) : null;

  if (!session) {
    return json({ error: 'Sessão não autenticada.' }, 401);
  }

  const client = getSupabaseClient();

  if (request.method === 'GET') {
    const { data, error } = await client
      .from('patrol_sessions')
      .select('id, viatura, operators, started_at, ended_at, status')
      .order('started_at', { ascending: false });

    if (error) {
      return json({ error: 'Não foi possível listar patrulhas.' }, 500);
    }

    const patrols = ((data ?? []) as Array<{
      id: string | number;
      viatura?: string | null;
      operators?: unknown[] | null;
      started_at?: string | null;
      status?: string | null;
    }>).map((item) => ({
      id: String(item.id),
      viatura: String(item.viatura ?? ''),
      operadores: Array.isArray(item.operators) ? item.operators.map((op) => String(op)) : [],
      inicio: item.started_at ? new Date(item.started_at).getTime() : Date.now(),
      status: item.status === 'encerrada' ? 'encerrada' : 'ativa',
    }));

    return json({ patrols });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  const body = await getJsonBody(request);
  if (!body) {
    return json({ error: 'Corpo inválido.' }, 400);
  }

  const action = String(body.action ?? '');

  if (action === 'create') {
    const viatura = String(body.viatura ?? '').trim();
    const operators = Array.isArray(body.operadores) ? body.operadores.map((item) => String(item)) : [];

    if (!viatura || operators.length === 0) {
      return json({ error: 'Selecione uma viatura e pelo menos um operador.' }, 400);
    }

    const { data, error } = await client
      .from('patrol_sessions')
      .insert({
        viatura,
        operators,
        status: 'ativa',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) {
      return json({ error: 'Não foi possível iniciar a patrulha.' }, 500);
    }

    return json({ ok: true, id: data.id });
  }

  if (action === 'stop') {
    const id = String(body.id ?? '');
    if (!id) {
      return json({ error: 'ID da patrulha obrigatório.' }, 400);
    }

    const { error } = await client
      .from('patrol_sessions')
      .update({ status: 'encerrada', ended_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return json({ error: 'Não foi possível encerrar a patrulha.' }, 500);
    }

    return json({ ok: true });
  }

  if (action === 'reset') {
    const { error } = await client.from('patrol_sessions').delete().neq('id', '');
    if (error) {
      return json({ error: 'Não foi possível limpar patrulhas.' }, 500);
    }
    return json({ ok: true });
  }

  return json({ error: 'Ação inválida.' }, 400);
}

async function handleStats(_request: Request): Promise<Response> {
  const client = getSupabaseClient();

  const [membersResult, patrolsResult, reportsResult] = await Promise.all([
    client.from('members').select('status, horas_patrulha, apreensoes_rs').eq('status', 'ATIVO'),
    client.from('patrol_sessions').select('id, status').eq('status', 'ativa'),
    client.from('rso_reports').select('armamento, drogas, municoes, bombas, dinheiro_marcado, detidos, ocorrencias, created_at'),
  ]);

  if (membersResult.error || patrolsResult.error || reportsResult.error) {
    return json({ error: 'Não foi possível carregar estatísticas.' }, 500);
  }

  const members = membersResult.data ?? [];
  const patrols = patrolsResult.data ?? [];
  const reports = reportsResult.data ?? [];

  const totalDrogas = reports.reduce((sum, report) => sum + Number(report.drogas ?? 0), 0);
  const totalArmamento = reports.reduce((sum, report) => sum + Number(report.armamento ?? 0), 0);
  const totalMunicoes = reports.reduce((sum, report) => sum + Number(report.municoes ?? 0), 0);
  const totalBombas = reports.reduce((sum, report) => sum + Number(report.bombas ?? 0), 0);
  const totalDinheiro = reports.reduce((sum, report) => sum + Number(report.dinheiro_marcado ?? 0), 0);
  const totalDetidos = reports.reduce((sum, report) => sum + Number(report.detidos ?? 0), 0);
  const totalOcorrencias = reports.reduce((sum, report) => sum + Number(report.ocorrencias ?? 0), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthReports = reports.filter((report) => new Date(report.created_at) >= monthStart);

  return json({
    drogas: totalDrogas,
    armamento: totalArmamento,
    municoes: totalMunicoes,
    bombas: totalBombas,
    dinheiroMarcado: totalDinheiro,
    operadoresAtivos: members.length,
    viaturasAtivas: patrols.length,
    ocorrenciasMes: monthReports.reduce((sum, report) => sum + Number(report.ocorrencias ?? 0), 0),
    patrulhasMes: monthReports.length,
    detidosMes: monthReports.reduce((sum, report) => sum + Number(report.detidos ?? 0), 0),
    tendencias: {
      ocorrenciasMes: null,
      patrulhasMes: null,
      detidosMes: null,
    },
    ultimaAtualizacao: reports.length ? new Date(Math.max(...reports.map((report) => new Date(report.created_at).getTime()))).toISOString() : null,
  });
}

async function handleBootstrap(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  const token = process.env.BOOTSTRAP_TOKEN ?? '';
  const body = await getJsonBody(request);
  if (!body) {
    return json({ error: 'Corpo da requisição inválido' }, 400);
  }

  if (!token || body.token !== token) {
    return json({ error: 'Bootstrap não autorizado.' }, 404);
  }

  const nome = String(body.nome ?? '').trim();
  const sobrenome = String(body.sobrenome ?? '').trim();
  const discordId = String(body.discordId ?? '').trim();
  const idJogo = String(body.idJogo ?? '').trim();
  const senha = String(body.senha ?? '');

  if (!nome || !sobrenome || !discordId || !idJogo || !senha) {
    return json({ error: 'Preencha nome, sobrenome, discord, ID de jogo e senha.' }, 400);
  }

  const client = getSupabaseClient();
  const { data: adminCount, error: countError } = await client
    .from('members')
    .select('id', { count: 'exact' })
    .eq('is_admin', true);

  if (countError) {
    return json({ error: 'Não foi possível validar o bootstrap.' }, 500);
  }

  if ((adminCount ?? []).length > 0) {
    return json({ error: 'Bootstrap já foi usado.' }, 404);
  }

  const { hash, salt } = hashPassword(senha);
  const { error } = await client.from('members').insert({
    nome,
    sobrenome,
    discord_id: discordId,
    id_jogo: idJogo,
    patente: 'General',
    funcao: 'Comandante',
    status: 'ATIVO',
    horas_patrulha: 0,
    apreensoes_rs: 0,
    is_admin: true,
    senha_hash: hash,
    senha_salt: salt,
  });

  if (error) {
    return json({ error: 'Não foi possível criar o primeiro administrador.' }, 500);
  }

  return json({ ok: true }, 201);
}

export async function GET(request: Request): Promise<Response> {
  const path = getRequestPath(request);

  switch (path) {
    case '/api/session':
      return handleSession(request);
    case '/api/logout':
      return handleLogout(request);
    case '/api/members':
      return handleMembers(request);
    case '/api/pending':
      return handlePending(request);
    case '/api/rso':
      return handleRso(request);
    case '/api/patrols':
      return handlePatrols(request);
    case '/api/stats':
      return handleStats(request);
    default:
      return json({ error: 'Rota não encontrada.' }, 404);
  }
}

export async function POST(request: Request): Promise<Response> {
  const path = getRequestPath(request);

  switch (path) {
    case '/api/login':
      return handleLogin(request);
    case '/api/logout':
      return handleLogout(request);
    case '/api/register':
      return handleRegister(request);
    case '/api/members':
      return handleMembers(request);
    case '/api/pending':
      return handlePending(request);
    case '/api/rso':
      return handleRso(request);
    case '/api/patrols':
      return handlePatrols(request);
    case '/api/bootstrap':
      return handleBootstrap(request);
    default:
      return json({ error: 'Rota não encontrada.' }, 404);
  }
}
