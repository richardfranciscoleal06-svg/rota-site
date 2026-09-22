# ROTA Jaguaré

Aplicação React + Vite + TypeScript para o painel interno da ROTA Jaguaré, com autenticação server-side em rotas de API e persistência em Supabase.

## Stack

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Supabase
- Vercel serverless API routes

## Requisitos

- Node.js 24.x (obrigatório para o Vercel)
- npm
- Conta no Supabase

## Setup local

1. Instale dependências:
   npm install
2. Copie o ambiente de exemplo:
   copy .env.example .env
3. Preencha as variáveis antes de iniciar:
   - SESSION_SECRET: valor forte e único por ambiente
   - SUPABASE_URL: URL do projeto Supabase
   - SUPABASE_SERVICE_ROLE_KEY: chave de serviço do projeto
   - SUPABASE_ANON_KEY: chave anônima para uso do frontend
   - VITE_SUPABASE_URL: mesma URL do projeto para o frontend
   - VITE_SUPABASE_ANON_KEY: mesma chave anônima para o frontend
   - BOOTSTRAP_TOKEN: token secreto para criar o primeiro administrador pelo endpoint de bootstrap
   - NODE_ENV: use `development` no ambiente local
4. Rode o schema em `supabase/schema.sql` no SQL Editor do Supabase.
5. Inicie o app:
   npm run dev

## Bootstrap do primeiro administrador

O endpoint `POST /api/bootstrap` só funciona quando `BOOTSTRAP_TOKEN` estiver definido no ambiente. Ele cria o primeiro usuário administrativo apenas quando não existe nenhum admin no banco e bloqueia novas tentativas depois.

## Estrutura principal

- src/ — frontend da aplicação
- api/ — rotas serverless em Vercel
- api/lib/ — helpers de autenticação e acesso ao Supabase
- supabase/schema.sql — schema principal do banco
- supabase/README.md — instruções do banco

## Autenticação

A autenticação usa sessão HTTP em cookie assinado e hash de senha com `crypto.scryptSync`.

## Supabase

O projeto foi migrado para Supabase e não depende mais do Netlify Database. Todas as rotas da API se conectam ao banco via `@supabase/supabase-js`.

## Segurança

- nunca versionar `.env` reais
- manter `SESSION_SECRET` forte e diferente por ambiente
- usar cookies `HttpOnly` e `Secure`
- rotas administrativas exigem sessão autenticada e autorização
- tratar duplicidade de `id_jogo` e `discord_id` antes do insert
