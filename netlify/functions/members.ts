import type { Handler } from '@netlify/functions';
import { getDatabase } from '@netlify/database';
import { enforceRequestSafety, isValidPatente, requireAdmin, requireAuth } from './_lib/auth';
import { MAX_NAME_LENGTH } from '../../src/types';

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
      const body = JSON.parse(event.body ?? '{}') as {
        action?: string;
        id?: string;
        patente?: string;
        funcao?: string;
        status?: 'ATIVO' | 'INATIVO';
      };

      const db = getDatabase();

      if (body.action === 'update' && body.id) {
        const admin = await requireAdmin(event);
        if (!admin.ok) {
          return {
            statusCode: admin.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: admin.error }),
          };
        }

        const patente = (body.patente ?? '').trim();
        const funcao = (body.funcao ?? '').trim();
        const status = (body.status ?? '').trim();

        if (!isValidPatente(patente) || !['ATIVO', 'INATIVO'].includes(status) || !funcao || funcao.length > MAX_NAME_LENGTH) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Patente, função ou status inválidos.' }),
          };
        }

        await db.sql`
          UPDATE members
          SET patente = ${patente},
              funcao = ${funcao},
              status = ${status},
              updated_at = now()
          WHERE id = ${body.id}
        `;

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true }),
        };
      }

      if (body.action === 'delete' && body.id) {
        const admin = await requireAdmin(event);
        if (!admin.ok) {
          return {
            statusCode: admin.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: admin.error }),
          };
        }

        const target = await db.sql<{ id: string; is_admin: boolean }>`
          SELECT id, is_admin
          FROM members
          WHERE id = ${body.id}
          LIMIT 1
        `;

        if (!target[0]) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Membro não encontrado.' }),
          };
        }

        if (target[0].is_admin) {
          const adminCount = await db.sql<{ count: number }>`
            SELECT COUNT(*)::int AS count
            FROM members
            WHERE is_admin = true
          `;

          if ((adminCount[0]?.count ?? 0) <= 1) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ok: false, error: 'Não é permitido apagar o último administrador.' }),
            };
          }
        }

        await db.sql`DELETE FROM members WHERE id = ${body.id}`;
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true }),
        };
      }

      if (body.action === 'reset-accounting') {
        const admin = await requireAdmin(event);
        if (!admin.ok) {
          return {
            statusCode: admin.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: admin.error }),
          };
        }

        await db.sql`
          UPDATE members
          SET horas_patrulha = 0,
              apreensoes_rs = 0,
              updated_at = now()
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
      console.error('members mutation failed', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Não foi possível processar a atualização.' }),
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
      nome: string;
      sobrenome: string;
      id_jogo: string;
      patente: string;
      funcao: string;
      status: 'ATIVO' | 'INATIVO';
      horas_patrulha: number;
      apreensoes_rs: number;
    }>`
      SELECT id, nome, sobrenome, id_jogo, patente, funcao, status, horas_patrulha, apreensoes_rs
      FROM members
      ORDER BY nome ASC
    `;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        members: rows.map((member) => ({
          id: member.id,
          nome: `${member.nome} ${member.sobrenome}`.trim(),
          idJogo: member.id_jogo,
          patente: member.patente,
          funcao: member.funcao,
          status: member.status,
          horasPatrulha: Number(member.horas_patrulha ?? 0),
          apreensoesRs: Number(member.apreensoes_rs ?? 0),
        })),
      }),
    };
  } catch (error) {
    console.error('members retrieval failed', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Não foi possível carregar os membros.' }),
    };
  }
};
