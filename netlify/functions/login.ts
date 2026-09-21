import crypto from 'node:crypto';
import type { Handler } from '@netlify/functions';
import { getDb } from './_lib/db';
import { buildSessionCookie, enforceRequestSafety, getSessionSecret } from './_lib/auth';

const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

function getClientKey(event: Parameters<Handler>[0]) {
  const forwarded = event.headers['x-forwarded-for'] ?? event.headers['X-Forwarded-For'] ?? '';
  const realIp = event.headers['x-nf-client-connection-ip'] ?? event.headers['X-NF-Client-Connection-IP'] ?? '';
  const candidate = (forwarded || realIp || 'unknown').split(',')[0].trim();
  return candidate || 'unknown';
}

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

  const secret = getSessionSecret();
  if (!secret) {
    console.error('login failed: missing or weak SESSION_SECRET');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Erro interno de autenticação.' }),
    };
  }

  try {
    const body = JSON.parse(event.body ?? '{}') as {
      id?: string;
      password?: string;
    };

    const loginId = (body.id ?? '').trim();
    const password = body.password ?? '';

    if (!loginId || !password || password.length < 10 || password.length > 128) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Informe o ID e a senha válida.' }),
      };
    }

    const clientKey = `${getClientKey(event)}:${loginId}`;
    const attempt = loginAttempts.get(clientKey);
    const now = Date.now();
    if (attempt && now - attempt.firstAttempt <= LOGIN_ATTEMPT_WINDOW_MS && attempt.count >= LOGIN_MAX_ATTEMPTS) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' }),
      };
    }

    const db = getDb();
    const rows = await db.sql<{ id: string; id_jogo: string; is_admin: boolean; senha_hash: string; senha_salt: string }>`
      SELECT id, id_jogo, is_admin, senha_hash, senha_salt
      FROM members
      WHERE id_jogo = ${loginId}
      LIMIT 1
    `;

    const member = rows[0];
    if (!member) {
      const fakeSalt = crypto.randomBytes(16).toString('hex');
      crypto.scryptSync(password, fakeSalt, 64);
      const staleAttempt = loginAttempts.get(clientKey);
      if (staleAttempt && now - staleAttempt.firstAttempt <= LOGIN_ATTEMPT_WINDOW_MS) {
        staleAttempt.count += 1;
        loginAttempts.set(clientKey, staleAttempt);
      } else {
        loginAttempts.set(clientKey, { count: 1, firstAttempt: now });
      }
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Credenciais inválidas.' }),
      };
    }

    const derivedHash = crypto.scryptSync(password, member.senha_salt, 64);
    const expectedHash = Buffer.from(member.senha_hash, 'hex');

    if (derivedHash.length !== expectedHash.length || !crypto.timingSafeEqual(derivedHash, expectedHash)) {
      const staleAttempt = loginAttempts.get(clientKey);
      if (staleAttempt && now - staleAttempt.firstAttempt <= LOGIN_ATTEMPT_WINDOW_MS) {
        staleAttempt.count += 1;
        loginAttempts.set(clientKey, staleAttempt);
      } else {
        loginAttempts.set(clientKey, { count: 1, firstAttempt: now });
      }
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Credenciais inválidas.' }),
      };
    }

    loginAttempts.delete(clientKey);

    const safeUser = {
      id: member.id,
      id_jogo: member.id_jogo,
      isAdmin: member.is_admin,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Set-Cookie': buildSessionCookie(
        {
          id: member.id,
          id_jogo: member.id_jogo,
          is_admin: member.is_admin,
        },
        secret
      ),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ user: safeUser }),
    };
  } catch (error) {
    console.error('login failed', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Ocorreu um erro ao autenticar o acesso.' }),
    };
  }
};
