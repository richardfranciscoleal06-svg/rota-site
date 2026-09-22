function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST' && request.method !== 'GET') {
    return json({ ok: false, error: 'Método não permitido' }, 405);
  }

  const cleared = 'session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax';
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cleared,
    },
  });
}
