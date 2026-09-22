create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sobrenome text not null,
  id_jogo text not null unique,
  discord_id text,
  patente text not null default 'Soldado',
  funcao text not null default 'Operador',
  status text not null default 'ATIVO' check (status in ('ATIVO', 'INATIVO')),
  horas_patrulha numeric not null default 0,
  apreensoes_rs numeric not null default 0,
  is_admin boolean not null default false,
  senha_hash text not null,
  senha_salt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (discord_id)
);

create table if not exists public.patrol_sessions (
  id uuid primary key default gen_random_uuid(),
  viatura text not null,
  operators text[] not null default '{}',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'ativa' check (status in ('ativa', 'encerrada')),
  created_at timestamptz not null default now()
);

create table if not exists public.rso_reports (
  id uuid primary key default gen_random_uuid(),
  enviado_por text not null,
  id_militar text not null,
  viatura text not null,
  patrol_id uuid,
  barca jsonb not null default '{}',
  ocorrencias integer not null default 0,
  detidos integer not null default 0,
  armamento integer not null default 0,
  drogas integer not null default 0,
  municoes integer not null default 0,
  bombas integer not null default 0,
  dinheiro_marcado integer not null default 0,
  resumo text not null default '',
  status text not null default 'pending' check (status in ('pending', 'validated', 'rejected')),
  hours_credited numeric not null default 0,
  credited_at timestamptz,
  credit_preview jsonb,
  created_at timestamptz not null default now(),
  constraint rso_reports_patrol_fk foreign key (patrol_id) references public.patrol_sessions (id) on delete set null
);

create table if not exists public.pending_registrations (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sobrenome text not null,
  id_jogo text not null unique,
  discord_id text not null unique,
  senha_hash text not null,
  senha_salt text not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger members_set_updated_at
before update on public.members
for each row
execute function public.set_updated_at();

create index if not exists members_status_idx on public.members(status);
create index if not exists members_is_admin_idx on public.members(is_admin);
create index if not exists patrolling_sessions_status_idx on public.patrol_sessions(status);
create index if not exists rso_reports_status_idx on public.rso_reports(status);
