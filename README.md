# ROTA Jaguaré

Aplicação React + Vite + TypeScript para o painel interno da ROTA Jaguaré, com autenticação server-side via Netlify Functions e persistência em Netlify Database.

## Stack

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Netlify Functions
- Netlify Database (Postgres serverless)

## Requisitos

- Node.js 20+
- npm
- Netlify CLI

## Setup local

1. Instale dependências:
   npm install
2. Copie o ambiente de exemplo:
   copy .env.example .env
3. Preencha as variáveis antes de iniciar:
   - SESSION_SECRET: valor forte e único por ambiente
   - BOOTSTRAP_TOKEN: token secreto para criar o primeiro administrador pelo endpoint de bootstrap
   - NETLIFY_DATABASE_URL: preenchido automaticamente quando o banco do Netlify estiver conectado
   - NODE_ENV: use `development` no ambiente local
4. Inicie o app em modo local com Netlify:
   npx netlify dev

## Bootstrap do primeiro administrador

O endpoint `POST /api/bootstrap` só funciona quando `BOOTSTRAP_TOKEN` estiver definido no ambiente. Ele cria o primeiro usuário administrativo apenas quando não existe nenhum admin no banco e bloqueia novas tentativas depois.

### Exemplo PowerShell

```powershell
$token = 'seu-token-forte-aqui'
$body = @{
  token = $token
  nome = 'Administrador'
  sobrenome = 'Sistema'
  discordId = 'admin#0001'
  idJogo = 'ADM-001'
  senha = 'SenhaSegura123'
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri 'http://localhost:8888/api/bootstrap' -ContentType 'application/json' -Body $body
```

A resposta não devolve senha nem hash. Depois que o primeiro admin for criado, o endpoint passa a responder `404` para impedir reaproveitamento do bootstrap.

### Remoção do token

Depois de criar o primeiro administrador, remova `BOOTSTRAP_TOKEN` do ambiente e reinicie o serviço para fechar o fluxo de bootstrap.

## Estrutura principal

- src/ — frontend da aplicação
- netlify/functions/ — API server-side
- netlify/database/migrations/ — migrações automáticas do Netlify Database
- netlify.toml — configuração do site, redirects e headers de segurança

## Autenticação

A autenticação usa sessão HTTP com cookie assinado e hash de senha com `crypto.scryptSync`.

## Netlify Database e migrações

O projeto segue o modelo nativo do Netlify Database:

- as migrações ficam em `netlify/database/migrations/`
- os arquivos devem seguir o padrão `<timestamp>_<slug>.sql`
- o Netlify aplica as migrações automaticamente em deploys de produção e preview
- a execução ocorre antes da publicação do deploy, para reduzir drift de schema

Estrutura atual esperada:

```text
netlify/database/migrations/
├── 20260920091425_create_core_schema.sql
```

Se você criar novas tabelas ou colunas, adicione uma nova migração em vez de alterar o schema existente em lugar.

## Deploy no Netlify

1. Conecte o repositório ao Netlify.
2. Ative o Netlify Database no painel do projeto.
3. Configure `SESSION_SECRET` nas Environment Variables do site.
4. Configure também qualquer segredo adicional necessário para o primeiro admin ou integrações.
5. Faça o deploy do repositório com a branch principal.

## Primeiro administrador

Crie o primeiro usuário administrador diretamente no banco ou por uma rotina de bootstrap segura antes de liberar acesso ao painel administrativo. Evite deixar credenciais permanentes no código-fonte ou em arquivos versionados.

## Segurança

- nunca versionar `.env` reais
- manter `SESSION_SECRET` forte e diferente por ambiente
- usar cookies `HttpOnly` e `Secure`
- manter o banco e as funções em Netlify, sem dependência do diretório `supabase/`

## Observação final

O projeto foi migrado para a arquitetura Netlify e não depende mais de Supabase. Qualquer referência antiga foi removida da configuração ativa do app.
