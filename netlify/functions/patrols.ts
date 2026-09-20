import type { Handler } from '@netlify/functions';
import { getDatabase } from '@netlify/database';
import { enforceRequestSafety, requireAdmin, requireAuth } from './_lib/auth';
import { MIN_CREW_TO_START, VIATURAS } from '../../src/types';

export const handler: Handler = async (event) => {
  const safety = enforceRequestSafety(event, event.body ?? null);
  if (!safety.ok) {
    return {
      statusCode: safety.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: safety.error }),
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const auth = await requireAuth(event);
      if (!auth.ok) {
        return {
          statusCode: auth.status,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: auth.error }),
        };
      }

      const body = JSON.parse(event.body ?? '{}') as {
        action?: 'create' | 'stop' | 'reset';
        id?: string;
        viatura?: string;
        operadores?: string[];
      };

      const db = getDatabase();

      if (body.action === 'create') {
        const viatura = (body.viatura ?? '').trim();
        if (!VIATURAS.some((item) => item === viatura)) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Viatura inválida.' }),
          };
        }

        const operadores = Array.isArray(body.operadores) ? body.operadores.map((value) => String(value).trim()).filter(Boolean) : [];
        if (operadores.length < MIN_CREW_TO_START) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: `Mínimo de ${MIN_CREW_TO_START} operadores.` }),
          };
        }

        const uniqueOperators = [...new Set(operadores)];
        const existing = await db.sql<{ id_jogo: string }>`
          SELECT id_jogo
          FROM members
          WHERE id_jogo = ANY(${uniqueOperators})
        `;

        if (existing.length !== uniqueOperators.length) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Operadores inválidos ou inexistentes.' }),
          };
        }

        const activePatrols = await db.sql<{ operators: string[] | null }>`
          SELECT operators
          FROM patrol_sessions
          WHERE status = 'active'
        `;

        const overlapping = activePatrols.some((row) => Array.isArray(row.operators) && row.operators.some((operator) => uniqueOperators.includes(operator)));
        if (overlapping) {
          return {
            statusCode: 409,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Um ou mais operadores já estão em outra patrulha ativa.' }),
          };
        }

        const insert = await db.sql<{ id: string }>`
          INSERT INTO patrol_sessions (viatura, operators, started_at, status)
          VALUES (${viatura}, ${JSON.stringify(uniqueOperators)}, now(), 'active')
          RETURNING id
        `;

        return {
          statusCode: 201,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true, id: insert[0]?.id ?? null }),
        };
      }

      if (body.action === 'reset') {
        const admin = await requireAdmin(event);
        if (!admin.ok) {
          return {
            statusCode: admin.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: admin.error }),
          };
        }

        await db.sql`DELETE FROM patrol_sessions`;
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true }),
        };
      }

      if (body.action === 'stop' && body.id) {
        const patrol = await db.sql<{ id: string; status: string; operators: string[] | null }>`
          SELECT id, status, operators
          FROM patrol_sessions
          WHERE id = ${body.id}
          LIMIT 1
        `;

        const current = patrol[0];
        if (!current) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Patrulha não encontrada.' }),
          };
        }

        if (current.status !== 'active') {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Só é possível encerrar patrulhas ativas.' }),
          };
        }

        if (!auth.user.isAdmin) {
          const operators = Array.isArray(current.operators) ? current.operators : [];
          if (!operators.includes(auth.user.idJogo)) {
            return {
              statusCode: 403,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ok: false, error: 'Só o administrador ou um participante pode encerrar a patrulha.' }),
            };
          }
        }

        await db.sql`
          UPDATE patrol_sessions
          SET status = 'ended', ended_at = now()
          WHERE id = ${body.id}
            AND status = 'active'
        `;

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true }),
        };
      }

      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Ação inválida.' }),
      };
    } catch (error) {
      console.error('patrol action failed', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Não foi possível processar a patrulha.' }),
      };
    }
  }

  try {
    const auth = await requireAuth(event);
    if (!auth.ok) {
      return {
        statusCode: auth.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: auth.error }),
      };
    }

    const db = getDatabase();
    const rows = await db.sql<{
      id: string;
      viatura: string;
      operators: string[] | null;
      started_at: string;
      status: 'active' | 'ended';
    }>`
      SELECT id, viatura, operators, started_at, status
      FROM patrol_sessions
      WHERE status = 'active'
      ORDER BY started_at DESC
    `;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patrols: rows.map((row) => ({
          id: row.id,
          viatura: row.viatura,
          operadores: Array.isArray(row.operators) ? row.operators : [],
          inicio: new Date(row.started_at).getTime(),
          status: row.status === 'active' ? 'ativa' : 'encerrada',
        })),
      }),
    };
  } catch (error) {
    console.error('patrol list failed', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Não foi possível listar as patrulhas.' }),
    };
  }
};
