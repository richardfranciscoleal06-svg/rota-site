import type { Handler } from '@netlify/functions';
import { getDatabase } from '@netlify/database';
import { getSessionSecret, readSessionCookie } from './_lib/auth';

export const handler: Handler = async (event) => {
  const secret = getSessionSecret();
  if (!secret) {
    console.error('session failed: missing or weak SESSION_SECRET');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: null }),
    };
  }

  const session = readSessionCookie(event.headers.cookie ?? event.headers.Cookie ?? undefined);

  if (!session) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: null }),
    };
  }

  try {
    const db = getDatabase();
    const rows = await db.sql<{ id: string; id_jogo: string; is_admin: boolean }>`
      SELECT id, id_jogo, is_admin
      FROM members
      WHERE id = ${session.id}
      LIMIT 1
    `;

    const user = rows[0];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: user ? { id: user.id, idJogo: user.id_jogo, isAdmin: user.is_admin } : null,
      }),
    };
  } catch (error) {
    console.error('session lookup failed', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: null }),
    };
  }
};
