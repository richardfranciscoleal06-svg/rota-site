CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sobrenome text NOT NULL,
  id_jogo text NOT NULL UNIQUE,
  discord_id text NOT NULL UNIQUE,
  patente text NOT NULL DEFAULT 'Recruta',
  funcao text NOT NULL DEFAULT 'Em Adaptação',
  status text NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  horas_patrulha numeric(10,2) NOT NULL DEFAULT 0 CHECK (horas_patrulha >= 0),
  apreensoes_rs numeric(14,2) NOT NULL DEFAULT 0 CHECK (apreensoes_rs >= 0),
  is_admin boolean NOT NULL DEFAULT false,
  senha_hash text NOT NULL,
  senha_salt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pending_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sobrenome text NOT NULL,
  id_jogo text NOT NULL UNIQUE,
  discord_id text NOT NULL UNIQUE,
  senha_hash text NOT NULL,
  senha_salt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patrol_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viatura text NOT NULL,
  operators jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rso_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enviado_por text NOT NULL,
  id_militar text NOT NULL,
  viatura text NOT NULL,
  patrol_id uuid REFERENCES patrol_sessions(id) ON DELETE SET NULL,
  barca jsonb NOT NULL DEFAULT '{}'::jsonb,
  ocorrencias integer NOT NULL DEFAULT 0 CHECK (ocorrencias >= 0),
  detidos integer NOT NULL DEFAULT 0 CHECK (detidos >= 0),
  armamento integer NOT NULL DEFAULT 0 CHECK (armamento >= 0),
  drogas integer NOT NULL DEFAULT 0 CHECK (drogas >= 0),
  municoes integer NOT NULL DEFAULT 0 CHECK (municoes >= 0),
  bombas integer NOT NULL DEFAULT 0 CHECK (bombas >= 0),
  dinheiro_marcado numeric NOT NULL DEFAULT 0 CHECK (dinheiro_marcado >= 0),
  resumo text NOT NULL DEFAULT '',
  data_envio timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
  hours_credited numeric(10,2) DEFAULT NULL,
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_id_jogo ON members (id_jogo);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_id_jogo ON pending_registrations (id_jogo);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_discord ON pending_registrations (discord_id);
CREATE INDEX IF NOT EXISTS idx_rso_reports_status ON rso_reports (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rso_reports_patrol_active_unique ON rso_reports (patrol_id) WHERE status IN ('pending', 'validated');
CREATE INDEX IF NOT EXISTS idx_patrol_sessions_status ON patrol_sessions (status);
