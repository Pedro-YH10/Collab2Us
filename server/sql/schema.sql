-- Extensão de criptografia segura
create extension if not exists pgcrypto;

-- Cadastro de usuários locais ou via SSO
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Gerenciamento centralizado de credenciais OAuth (Google, Miro, Trello)
create table if not exists oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider in ('google','miro','trello')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists idx_oauth_tokens_user_provider on oauth_tokens(user_id, provider);

-- Mapeamento e rastreabilidade sob demanda com suporte a múltiplos nós (Grafo)
create table if not exists story_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  miro_board_id text not null,
  miro_item_id text not null,
  miro_item_ids jsonb default '[]'::jsonb,
  miro_item_url text,
  trello_board_id text not null,
  trello_card_id text not null,
  trello_card_url text,
  content_hash text,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (miro_item_id, trello_card_id)
);

create index if not exists idx_mappings_miro on story_mappings(miro_item_id);
create index if not exists idx_mappings_trello on story_mappings(trello_card_id);
create index if not exists idx_mappings_user on story_mappings(user_id);

-- Histórico de transações de conversão ou sincronia
create table if not exists sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source text not null check (source in ('miro','trello')),
  destination text not null check (destination in ('miro','trello')),
  status text not null check (status in ('pending','running','success','failed')) default 'pending',
  stats jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Avaliações acadêmicas sobre as metodologias de validação TAM e SUS
create table if not exists academic_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  q1_utility integer not null,
  q2_usability integer not null,
  q3_frequency integer not null,
  q4_complexity integer not null,
  computed_score numeric(5,2) not null,
  created_at timestamptz not null default now()
);

-- Tabela de customização de fluxo de trabalho por equipe ou usuário
create table if not exists workflow_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  min_qus_score integer not null default 70 check (min_qus_score between 0 and 100),
  default_template text not null default 'connextra' check (default_template in ('connextra', 'jtbd', 'custom', 'raw')),
  yellow_role_color text not null default 'yellow',
  green_criteria_color text not null default 'green',
  ai_provider text not null default 'openai',
  ai_model text,
  ai_api_key text,
  custom_system_prompt text,
  created_at timestamptz not null default now()
);

create index if not exists idx_workflow_settings_user on workflow_settings(user_id);

-- Migrações completas para estruturação defensiva da tabela de rastreabilidade
alter table story_mappings add column if not exists miro_item_url text;
alter table story_mappings add column if not exists trello_card_url text;
alter table story_mappings add column if not exists miro_item_ids jsonb default '[]'::jsonb;
alter table story_mappings add column if not exists content_hash text;
alter table story_mappings add column if not exists last_synced_at timestamptz default now();
alter table story_mappings add column if not exists updated_at timestamptz default now();

alter table workflow_settings add column if not exists ai_provider text not null default 'openai';
alter table workflow_settings add column if not exists ai_model text;
alter table workflow_settings add column if not exists ai_api_key text;
alter table workflow_settings add column if not exists custom_system_prompt text;

-- Habilitação de Row Level Security (RLS) para o Supabase
alter table users enable row level security;
alter table oauth_tokens enable row level security;
alter table story_mappings enable row level security;
alter table sync_jobs enable row level security;
alter table academic_evaluations enable row level security;
alter table workflow_settings enable row level security;