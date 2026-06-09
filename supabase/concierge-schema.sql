-- Recepcionista IA — conversaciones y base de conocimiento
-- Ejecutar en Supabase SQL Editor después de schema.sql

create table if not exists public.concierge_sessions (
  id text primary key,
  visitor_id text,
  guest_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.concierge_messages (
  id text primary key default gen_random_uuid()::text,
  session_id text not null references public.concierge_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.concierge_knowledge (
  id text primary key default gen_random_uuid()::text,
  topic text not null,
  content text not null,
  source text not null default 'conversation',
  session_id text references public.concierge_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_concierge_messages_session on public.concierge_messages(session_id, created_at);
create index if not exists idx_concierge_knowledge_created on public.concierge_knowledge(created_at desc);

alter table public.concierge_sessions enable row level security;
alter table public.concierge_messages enable row level security;
alter table public.concierge_knowledge enable row level security;

drop policy if exists lumina_concierge_sessions_all on public.concierge_sessions;
create policy lumina_concierge_sessions_all on public.concierge_sessions for all using (true) with check (true);

drop policy if exists lumina_concierge_messages_all on public.concierge_messages;
create policy lumina_concierge_messages_all on public.concierge_messages for all using (true) with check (true);

drop policy if exists lumina_concierge_knowledge_all on public.concierge_knowledge;
create policy lumina_concierge_knowledge_all on public.concierge_knowledge for all using (true) with check (true);

drop trigger if exists concierge_sessions_updated_at on public.concierge_sessions;
create trigger concierge_sessions_updated_at before update on public.concierge_sessions
  for each row execute function public.set_updated_at();
