import { hashPassword } from './lib/auth.js';
import { getSupabaseClient } from './lib/supabase.js';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido' }, 405);
  }

  let body: {
    nome?: string;
    sobrenome?: string;
    discordId?: string;
    discord_id?: string;
    rgDiscord?: string;
    rg_discord?: string;
    idJogo?: string;
    id_jogo?: string;
    idMilitar?: string;
    id_militar?: string;
    senha?: string;
    password?: string;
  };

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido' }, 400);
  }

  const nome = String(body.nome ?? '').trim();
  const sobrenome = String(body.sobrenome ?? '').trim();
  const discordId = String(body.discordId ?? body.discord_id ?? body.rgDiscord ?? body.rg_discord ?? '').trim();
  const idJogo = String(body.idJogo ?? body.id_jogo ?? body.idMilitar ?? body.id_militar ?? '').trim();
  const senha = String(body.senha ?? body.password ?? '');

  if (!nome || !sobrenome || !discordId || !idJogo || !senha) {
    return jsonResponse({ error: 'Preencha nome, sobrenome, RG Discord, ID Militar e senha.' }, 400);
  }

  const client = getSupabaseClient();

  const [existingMembers, existingPending] = await Promise.all([
    client.from('members').select('id').or(`id_jogo.eq.${idJogo},discord_id.eq.${discordId}`),
    client.from('pending_registrations').select('id').or(`id_jogo.eq.${idJogo},discord_id.eq.${discordId}`),
  ]);

  if (existingMembers.error || existingPending.error) {
    return jsonResponse({ error: 'Não foi possível validar o cadastro.' }, 500);
  }

  if ((existingMembers.data ?? []).length > 0 || (existingPending.data ?? []).length > 0) {
    return jsonResponse({ error: 'ID Militar ou RG Discord já cadastrado.' }, 409);
  }

  const { hash, salt } = hashPassword(senha);
  const { data, error } = await client
    .from('pending_registrations')
    .insert({
      nome,
      sobrenome,
      discord_id: discordId,
      id_jogo: idJogo,
      senha_hash: hash,
      senha_salt: salt,
    })
    .select('id, nome, sobrenome, id_jogo, discord_id')
    .single();

  if (error || !data) {
    console.error('Erro ao salvar cadastro pendente:', error);
    return jsonResponse({ error: 'Erro ao salvar no banco de dados.' }, 500);
  }

  return jsonResponse({ ok: true, pending: data }, 201);
}
