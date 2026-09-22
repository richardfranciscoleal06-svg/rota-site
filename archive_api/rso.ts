import { parseCookieHeader, verifySession } from './lib/auth.js';
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

export async function GET(request: Request): Promise<Response> {
  try {
    const session = getSessionOrThrow(request);
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
  } catch {
    return json({ error: 'Sessão não autenticada.' }, 401);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const session = getSessionOrThrow(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return json({ error: 'Corpo inválido.' }, 400);
    }

    const client = getSupabaseClient();
    const action = String((body as Record<string, unknown>).action ?? '');

    if (action === 'create') {
      const payload = body as Record<string, unknown>;
      const barca = typeof payload.barca === 'object' && payload.barca ? (payload.barca as Record<string, unknown>) : {};
      const patrolId = payload.patrolId ? String(payload.patrolId) : null;

      const { data, error } = await client.from('rso_reports').insert({
        enviado_por: session.idJogo,
        id_militar: session.idJogo,
        viatura: String((payload.viatura as string) ?? ''),
        patrol_id: patrolId,
        barca,
        ocorrencias: Number((payload.ocorrencias as number) ?? 0),
        detidos: Number((payload.detidos as number) ?? 0),
        armamento: Number((payload.armamento as number) ?? 0),
        drogas: Number((payload.drogas as number) ?? 0),
        municoes: Number((payload.municoes as number) ?? 0),
        bombas: Number((payload.bombas as number) ?? 0),
        dinheiro_marcado: Number((payload.dinheiroMarcado as number) ?? 0),
        resumo: String((payload.resumo as string) ?? ''),
        status: 'pending',
      }).select('id').single();

      if (error || !data) {
        return json({ error: 'Não foi possível criar o relatório.' }, 500);
      }

      return json({ ok: true, id: data.id }, 201);
    }

    if (action === 'validate' || action === 'reject') {
      const id = String((body as Record<string, unknown>).id ?? '');
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
