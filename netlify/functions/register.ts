import crypto from 'node:crypto';
import type { Handler } from '@netlify/functions';
import { getDatabase } from '@netlify/database';
import { enforceRequestSafety } from './_lib/auth';
import { MAX_DISCORD_LENGTH, MAX_ID_LENGTH, MAX_NAME_LENGTH } from '../../src/types';

export const handler: Handler = async (event) => {
  const safety = enforceRequestSafety(event, event.body ?? null);
  if (!safety.ok) {
    return {
      statusCode: safety.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: safety.error }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Método não permitido.' }),
    };
  }

  try {
    const body = JSON.parse(event.body ?? '{}') as {
      nome?: string;
      sobrenome?: string;
      rgDiscord?: string;
      idMilitar?: string;
      senha?: string;
    };

    const nome = (body.nome ?? '').trim();
    const sobrenome = (body.sobrenome ?? '').trim();
    const rgDiscord = (body.rgDiscord ?? '').trim();
    const idMilitar = (body.idMilitar ?? '').trim();
    const senha = body.senha ?? '';

    if (!nome || !sobrenome || !rgDiscord || !idMilitar || !senha) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Preencha todos os campos do cadastro.' }),
      };
    }

    if (nome.length > MAX_NAME_LENGTH || sobrenome.length > MAX_NAME_LENGTH || rgDiscord.length > MAX_DISCORD_LENGTH || idMilitar.length > MAX_ID_LENGTH) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Algum campo excede o tamanho permitido.' }),
      };
    }

    if (senha.length < 10 || senha.length > 128) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'A senha deve ter entre 10 e 128 caracteres.' }),
      };
    }

    const db = getDatabase();
    const pendingCount = await db.sql<{ count: number }>`
      SELECT COUNT(*)::int AS count
      FROM pending_registrations
    `;

    if ((pendingCount[0]?.count ?? 0) >= 200) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Limite de cadastros pendentes atingido.' }),
      };
    }

    const duplicates = await db.sql<{ id: string }>`
      SELECT id FROM members
      WHERE id_jogo = ${idMilitar}
         OR discord_id = ${rgDiscord}
      LIMIT 1
    `;

    const pendingDuplicates = await db.sql<{ id: string }>`
      SELECT id FROM pending_registrations
      WHERE id_jogo = ${idMilitar}
         OR discord_id = ${rgDiscord}
      LIMIT 1
    `;

    if (duplicates[0] || pendingDuplicates[0]) {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Já existe uma solicitação ou registro com esses dados.' }),
      };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(senha, salt, 64).toString('hex');

    await db.sql`
      INSERT INTO pending_registrations (nome, sobrenome, id_jogo, discord_id, senha_hash, senha_salt)
      VALUES (${nome}, ${sobrenome}, ${idMilitar}, ${rgDiscord}, ${hash}, ${salt})
    `;

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, message: 'Solicitação registrada com sucesso.' }),
    };
  } catch (error) {
    console.error('register failed', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Não foi possível registrar a solicitação.' }),
    };
  }
};
