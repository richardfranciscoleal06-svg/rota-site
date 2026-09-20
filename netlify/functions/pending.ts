import type { Handler } from '@netlify/functions';
import { getDatabase } from '@netlify/database';
import { enforceRequestSafety, requireAdmin } from './_lib/auth';

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
      const admin = await requireAdmin(event);
      if (!admin.ok) {
        return {
          statusCode: admin.status,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: admin.error }),
        };
      }

      const body = JSON.parse(event.body ?? '{}') as { action?: string; id?: string };
      const db = getDatabase();

      if (body.action === 'approve' && body.id) {
        const rows = await db.sql<{
          id: string;
          nome: string;
          sobrenome: string;
          id_jogo: string;
          discord_id: string;
          senha_hash: string;
          senha_salt: string;
        }>`
          SELECT id, nome, sobrenome, id_jogo, discord_id, senha_hash, senha_salt
          FROM pending_registrations
          WHERE id = ${body.id}
          LIMIT 1
        `;

        const pending = rows[0];
        if (!pending) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Solicitação não encontrada.' }),
          };
        }

        const existing = await db.sql<{ id: string }>`
          SELECT id
          FROM members
          WHERE id_jogo = ${pending.id_jogo}
          LIMIT 1
        `;

        if (existing[0]) {
          return {
            statusCode: 409,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: false, error: 'Cadastro já existe para este ID de jogo.' }),
          };
        }

        await db.sql`
          INSERT INTO members (nome, sobrenome, id_jogo, discord_id, patente, funcao, status, senha_hash, senha_salt, is_admin)
          VALUES (${pending.nome}, ${pending.sobrenome}, ${pending.id_jogo}, ${pending.discord_id}, 'Recruta', 'Em Adaptação', 'ATIVO', ${pending.senha_hash}, ${pending.senha_salt}, false)
        `;

        await db.sql`
          DELETE FROM pending_registrations WHERE id = ${body.id}
        `;

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true }),
        };
      }

      if (body.action === 'deny' && body.id) {
        await db.sql`
          DELETE FROM pending_registrations WHERE id = ${body.id}
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
      console.error('pending approval failed', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Não foi possível processar a solicitação.' }),
      };
    }
  }

  try {
    const admin = await requireAdmin(event);
    if (!admin.ok) {
      return {
        statusCode: admin.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: admin.error }),
      };
    }

    const db = getDatabase();
    const rows = await db.sql<{
      id: string;
      nome: string;
      sobrenome: string;
      id_jogo: string;
      discord_id: string;
      created_at: string;
    }>`
      SELECT id, nome, sobrenome, id_jogo, discord_id, created_at
      FROM pending_registrations
      ORDER BY created_at DESC
    `;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pending: rows.map((row) => ({
          id: row.id,
          nome: row.nome,
          sobrenome: row.sobrenome,
          idMilitar: row.id_jogo,
          rgDiscord: row.discord_id,
          senha: '',
          dataSolicitacao: row.created_at,
        })),
      }),
    };
  } catch (error) {
    console.error('pending list failed', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Não foi possível carregar as pendências.' }),
    };
  }
};
