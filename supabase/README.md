# Supabase

Este projeto usa o Supabase como banco principal para autenticação, cadastros e relatórios.

## Variáveis de ambiente

No ambiente do deploy, configure estas variáveis:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_ANON_KEY
- SESSION_SECRET

Para frontend Vite, use também:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## Schema

A estrutura inicial do banco está em `./schema.sql`.

## Execução

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Rode o conteúdo de `supabase/schema.sql`.
4. Ajuste as políticas RLS conforme a regra de negócio.

> O projeto foi migrado para o Supabase e não depende mais do Netlify Database.
