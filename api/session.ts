import { parseCookieHeader, verifySession } from './lib/auth.js';

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ error: 'Método não permitido' }, 405);
  }

  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const token = cookies.session;
  const session = token ? verifySession(token) : null;

  return json({
    user: session
      ? {
          id: session.id,
          isAdmin: session.isAdmin,
        }
      : null,
  });
}
