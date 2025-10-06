create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider in ('google','miro','trello')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz not null default now()
);

create index if not exists idx_oauth_tokens_user_provider on oauth_tokens(user_id, provider);

create table if not exists story_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_text text not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists conversion_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pattern text not null,
  action text not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

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
