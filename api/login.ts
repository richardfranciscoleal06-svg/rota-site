import { buildCookieString, signSession, verifyPassword } from './lib/auth';
import { getSupabaseClient } from './lib/supabase';

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  let body: { id?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Corpo da requisição inválido' }, 400);
  }

  const id = String(body.id ?? '').trim();
  const password = String(body.password ?? '');

  if (!id || !password) {
    return json({ error: 'Preencha ID e senha.' }, 400);
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('members')
      .select('id, id_jogo, is_admin, senha_hash, senha_salt')
      .eq('id_jogo', id)
      .maybeSingle();

    if (error || !data) {
      return json({ error: 'Credencial inválida.' }, 401);
    }

    const validPassword = verifyPassword(password, data.senha_hash, data.senha_salt);
    if (!validPassword) {
      return json({ error: 'Credencial inválida.' }, 401);
    }

    const token = signSession({
      id: data.id,
      idJogo: data.id_jogo,
      isAdmin: Boolean(data.is_admin),
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const cookie = buildCookieString('session', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return new Response(JSON.stringify({ user: { id: data.id, isAdmin: Boolean(data.is_admin) } }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
  } catch (error) {
    console.error('Erro de autenticação:', error);
    return json({ error: 'Erro interno de autenticação.' }, 500);
  }
}
