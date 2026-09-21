import crypto from 'node:crypto';
import type { Handler } from '@netlify/functions';
import { getDb } from './_lib/db';
import { enforceRequestSafety } from './_lib/auth';
import { MAX_DISCORD_LENGTH, MAX_ID_LENGTH, MAX_NAME_LENGTH } from '../../src/types';

export const handler: Handler = async (event) => {
  const safety = enforceRequestSafety(event, event.body ?? null);
  if (!safety.ok) {
    return {
      statusCode: safety.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: safety.error }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Método não permitido.' }),
    };
  }

  const configuredToken = process.env.BOOTSTRAP_TOKEN?.trim();
  if (!configuredToken) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Não encontrado.' }),
    };
  }

  try {
    const body = JSON.parse(event.body ?? '{}') as {
      token?: string;
      nome?: string;
      sobrenome?: string;
      discordId?: string;
      idJogo?: string;
      senha?: string;
    };

    const providedToken = (body.token ?? '').trim();
    const tokenBuffer = Buffer.from(configuredToken, 'utf8');
    const providedBuffer = Buffer.from(providedToken, 'utf8');

    if (
      !providedToken ||
      providedBuffer.length !== tokenBuffer.length ||
      !crypto.timingSafeEqual(providedBuffer, tokenBuffer)
    ) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Token inválido.' }),
      };
    }

    const db = getDb();
    const adminCount = await db.sql<{ count: number }>`
      SELECT COUNT(*)::int AS count
      FROM members
      WHERE is_admin = true
    `;

    if ((adminCount[0]?.count ?? 0) > 0) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Não encontrado.' }),
      };
    }

    const nome = (body.nome ?? '').trim();
    const sobrenome = (body.sobrenome ?? '').trim();
    const discordId = (body.discordId ?? '').trim();
    const idJogo = (body.idJogo ?? '').trim();
    const senha = body.senha ?? '';

    if (!nome || !sobrenome || !discordId || !idJogo || !senha) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Preencha todos os campos obrigatórios.' }),
      };
    }

    if (nome.length > MAX_NAME_LENGTH || sobrenome.length > MAX_NAME_LENGTH || discordId.length > MAX_DISCORD_LENGTH || idJogo.length > MAX_ID_LENGTH) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Algum campo excede o tamanho permitido.' }),
      };
    }

    if (senha.length < 12 || senha.length > 128) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'A senha deve ter entre 12 e 128 caracteres.' }),
      };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(senha, salt, 64).toString('hex');

    await db.sql`
      INSERT INTO members (
        nome,
        sobrenome,
        id_jogo,
        discord_id,
        patente,
        funcao,
        status,
        senha_hash,
        senha_salt,
        is_admin
      ) VALUES (
        ${nome},
        ${sobrenome},
        ${idJogo},
        ${discordId},
        'General',
        'Administrador',
        'ATIVO',
        ${hash},
        ${salt},
        true
      )
    `;

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, message: 'Primeiro administrador criado com sucesso.' }),
    };
  } catch (error) {
    console.error('bootstrap failed', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Não foi possível criar o administrador inicial.' }),
    };
  }
};
