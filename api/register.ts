import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function hashPassword(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
  return { hash, salt };
}

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido' }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido' }, 400);
  }

  // Aceita algumas variações de nome de campo — ajuste aqui se o payload
  // real do formulário (veja na aba Network do navegador) usar outras chaves.
  const nome = body.nome;
  const sobrenome = body.sobrenome;
  const discordId = body.discordId ?? body.discord_id ?? body.rgDiscord ?? body.rg_discord;
  const idJogo = body.idJogo ?? body.id_jogo ?? body.idMilitar ?? body.id_militar;
  const senha = body.senha ?? body.password;

  if (!nome || !sobrenome || !idJogo || !senha) {
    return jsonResponse({ error: 'Preencha nome, sobrenome, ID Militar e senha.' }, 400);
  }

  const { hash, salt } = hashPassword(senha);

  const { data, error } = await supabase
    .from('members')
    .insert({
      nome,
      sobrenome,
      discord_id: discordId || null,
      id_jogo: idJogo,
      senha_hash: hash,
      senha_salt: salt,
    })
    .select('id, nome, sobrenome, id_jogo, discord_id, status')
    .single();

  if (error) {
    // 23505 = violação de UNIQUE (id_jogo ou discord_id já cadastrado)
    const status = error.code === '23505' ? 409 : 500;
    const message =
      error.code === '23505'
        ? 'ID Militar ou RG Discord já cadastrado.'
        : 'Erro ao salvar no banco de dados.';
    console.error('Erro ao registrar membro:', error);
    return jsonResponse({ error: message }, status);
  }

  return jsonResponse({ member: data }, 201);
}
