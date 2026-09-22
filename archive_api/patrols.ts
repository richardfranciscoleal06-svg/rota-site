import { parseCookieHeader, verifySession } from './lib/auth.js';
import { getSupabaseClient } from './lib/supabase.js';

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request: Request): Promise<Response> {
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
    }>).map((item: {
      id: string | number;
      viatura?: string | null;
      operators?: unknown[] | null;
      started_at?: string | null;
      status?: string | null;
    }) => ({
      id: String(item.id),
      viatura: String(item.viatura ?? ''),
      operadores: Array.isArray(item.operators)
        ? item.operators.map((op: unknown) => String(op))
        : [],
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

    // === SUBSTITUA A PARTIR DAQUI ===
    const { data, error } = await client
      .from('patrol_sessions')
      .insert({
        viatura,
        operators,
        status: 'ativa',
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(), // <-- Linha adicionada aqui
      })
      .select('id')
      .single();

    if (error || !data) {
      // Adicionei este console.log para ver o erro real no terminal, caso volte a falhar
      console.error("ERRO SUPABASE:", error); 
      return json({ error: error?.message || 'Não foi possível iniciar a patrulha.' }, 500);
    }
    // === ATÉ AQUI ==
    
    return json({ ok: true, id: data.id });
  }

  if (action === 'stop') {
    const id = String(bodyObj.id ?? '');
    if (!id) {
      return json({ error: 'ID da patrulha obrigatório.' }, 400);
    }

    const { error } = await client
      .from('patrol_sessions')
      .update({
        status: 'encerrada',
        ended_at: new Date().toISOString(),
      })
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