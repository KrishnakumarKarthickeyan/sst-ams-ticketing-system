-- ============================================================================
-- Tier-2 Microsoft Teams bot — proactive conversation references.
--
-- RUN MANUALLY. Output only — do NOT auto-execute.
--
-- The "Assist360" bot stores one row per chat it has been installed into (keyed
-- by the Teams conversation id). The stored Bot Framework conversation reference
-- (serviceUrl + conversation/bot/user identifiers) is what lets the server post
-- proactively into that chat later. Written only by the server bot endpoint
-- (service-role); never read or written from the browser.
-- ============================================================================

create table if not exists public.teams_bot_conversations (
  id              uuid primary key default gen_random_uuid(),
  conversation_id text not null unique,
  reference       jsonb not null,
  user_name       text,
  user_aad_id     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.teams_bot_conversations is
  'Bot Framework conversation references for the Assist360 Teams bot (Tier-2 proactive messaging).';

-- Server-only table: enable RLS with NO policies so anon/authenticated clients
-- get nothing. The bot endpoint uses the service-role key, which bypasses RLS.
alter table public.teams_bot_conversations enable row level security;

create index if not exists idx_teams_bot_conversations_conversation_id
  on public.teams_bot_conversations (conversation_id);
