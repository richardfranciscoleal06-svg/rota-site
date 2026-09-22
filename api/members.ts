import { parseCookieHeader, verifySession } from './lib/auth';
import { getSupabaseClient } from './lib/supabase';

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function normalizeMember(member: Record<string, unknown>) {
  const normalized = {
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

  return normalized;
}

export default async function handler(request: Request): Promise<Response> {
  const sessionToken = parseCookieHeader(request.headers.get('cookie')).session;
  const session = sessionToken ? verifySession(sessionToken) : null;

  if (!session) {
    return json({ error: 'Sessão não autenticada.' }, 401);
  }

  if (request.method === 'GET') {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('members')
      .select('id, nome, sobrenome, id_jogo, discord_id, patente, funcao, status, horas_patrulha, apreensoes_rs, is_admin')
      .order('nome', { ascending: true });

    if (error) {
      return json({ error: 'Não foi possível listar membros.' }, 500);
    }

    const members = (data ?? []).map((member) => {
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

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ error: 'Corpo inválido.' }, 400);
  }

  if (!session.isAdmin) {
    return json({ error: 'Acesso restrito ao comando.' }, 403);
  }

  const client = getSupabaseClient();
  const action = String((body as Record<string, unknown>).action ?? '');

  if (action === 'update') {
    const id = String((body as Record<string, unknown>).id ?? '');
    const patch = (body as Record<string, unknown>);
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
    const id = String((body as Record<string, unknown>).id ?? '');
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
}
