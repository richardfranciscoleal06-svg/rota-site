import type { Handler } from '@netlify/functions';

export const handler: Handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'rota_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure',
    },
    body: JSON.stringify({ ok: true }),
  };
};
