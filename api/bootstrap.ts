import { hashPassword } from './lib/auth';
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

  const token = process.env.BOOTSTRAP_TOKEN ?? '';
  let body: { token?: string; nome?: string; sobrenome?: string; discordId?: string; idJogo?: string; senha?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Corpo da requisição inválido' }, 400);
  }

  if (!token || body.token !== token) {
    return json({ error: 'Bootstrap não autorizado.' }, 404);
  }

  const nome = String(body.nome ?? '').trim();
  const sobrenome = String(body.sobrenome ?? '').trim();
  const discordId = String(body.discordId ?? '').trim();
  const idJogo = String(body.idJogo ?? '').trim();
  const senha = String(body.senha ?? '');

  if (!nome || !sobrenome || !discordId || !idJogo || !senha) {
    return json({ error: 'Preencha nome, sobrenome, discord, ID de jogo e senha.' }, 400);
  }

  const client = getSupabaseClient();
  const { data: adminCount, error: countError } = await client
    .from('members')
    .select('id', { count: 'exact' })
    .eq('is_admin', true);

  if (countError) {
    return json({ error: 'Não foi possível validar o bootstrap.' }, 500);
  }

  if ((adminCount ?? []).length > 0) {
    return json({ error: 'Bootstrap já foi usado.' }, 404);
  }

  const { hash, salt } = hashPassword(senha);
  const { error } = await client.from('members').insert({
    nome,
    sobrenome,
    discord_id: discordId,
    id_jogo: idJogo,
    patente: 'General',
    funcao: 'Comandante',
    status: 'ATIVO',
    horas_patrulha: 0,
    apreensoes_rs: 0,
    is_admin: true,
    senha_hash: hash,
    senha_salt: salt,
  });

  if (error) {
    return json({ error: 'Não foi possível criar o primeiro administrador.' }, 500);
  }

  return json({ ok: true }, 201);
}
