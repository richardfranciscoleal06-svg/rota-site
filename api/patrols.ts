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

  const client = getSupabaseClient();

  if (request.method === 'GET') {
    const { data, error } = await client
      .from('patrol_sessions')
      .select('id, viatura, operators, started_at, ended_at, status')
      .order('started_at', { ascending: false });

    if (error) {
      return json({ error: 'Não foi possível listar patrulhas.' }, 500);
    }

    const patrols = (data ?? []).map((item) => ({
      id: String(item.id),
      viatura: String(item.viatura),
      operadores: Array.isArray(item.operators) ? item.operators.map((op) => String(op)) : [],
      inicio: item.started_at ? new Date(item.started_at).getTime() : Date.now(),
      status: item.status === 'encerrada' ? 'encerrada' : 'ativa',
    }));

    return json({ patrols });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ error: 'Corpo inválido.' }, 400);
  }

 const bodyObj = body as Record<string, unknown>;
const action = String(bodyObj.action ?? '');

if (action === 'create') {
  const viatura = String(bodyObj.viatura ?? '').trim();

  const operadoresRaw = bodyObj.operadores;
  const operators = Array.isArray(operadoresRaw)
    ? operadoresRaw.map((item) => String(item))
    : [];

  if (!viatura || operators.length === 0) {
    return json({ error: 'Selecione uma viatura e pelo menos um operador.' }, 400);
  }
  
}

    if (!viatura || operators.length === 0) {
      return json({ error: 'Selecione uma viatura e pelo menos um operador.' }, 400);
    }

    const { data, error } = await client.from('patrol_sessions').insert({
      viatura,
      operators,
      status: 'ativa',
      started_at: new Date().toISOString(),
    }).select('id').single();

    if (error || !data) {
      return json({ error: 'Não foi possível iniciar a patrulha.' }, 500);
    }

    return json({ ok: true, id: data.id });
  }

  if (action === 'stop') {
    const id = String((body as Record<string, unknown>).id ?? '');
    if (!id) {
      return json({ error: 'ID da patrulha obrigatório.' }, 400);
    }

    const { error } = await client.from('patrol_sessions').update({
      status: 'encerrada',
      ended_at: new Date().toISOString(),
    }).eq('id', id);

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
