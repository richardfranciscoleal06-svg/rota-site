import { parseCookieHeader, verifySession } from './lib/auth.js';
import { getSupabaseClient } from './lib/supabase.js';

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(request: Request): Promise<Response> {
  const sessionToken = parseCookieHeader(request.headers.get('cookie')).session;
  const session = sessionToken ? verifySession(sessionToken) : null;

  if (!session) {
    return json({ error: 'Sessão não autenticada.' }, 401);
  }

  if (!session.isAdmin) {
    return json({ error: 'Acesso restrito ao comando.' }, 403);
  }

  const client = getSupabaseClient();

  if (request.method === 'GET') {
    const { data, error } = await client
      .from('pending_registrations')
      .select('id, nome, sobrenome, id_jogo, discord_id, senha_hash, senha_salt, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return json({ error: 'Não foi possível carregar solicitações.' }, 500);
    }

    const pending = (data ?? []).map((item) => ({
      id: String(item.id),
      nome: String(item.nome),
      sobrenome: String(item.sobrenome),
      rgDiscord: String(item.discord_id),
      idMilitar: String(item.id_jogo),
      senha: '',
      dataSolicitacao: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
    }));

    return json({ pending });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ error: 'Corpo inválido.' }, 400);
  }

  const action = String((body as Record<string, unknown>).action ?? '');
  const id = String((body as Record<string, unknown>).id ?? '');

  if (!id) {
    return json({ error: 'ID da solicitação obrigatório.' }, 400);
  }

  const pendingItem = await client.from('pending_registrations').select('id, nome, sobrenome, id_jogo, discord_id, senha_hash, senha_salt').eq('id', id).maybeSingle();

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
}
