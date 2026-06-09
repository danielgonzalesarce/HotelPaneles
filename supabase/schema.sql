-- Lumina Hotel & Spa — Supabase schema
-- Run in Supabase Dashboard → SQL Editor

create extension if not exists "pgcrypto";

-- ─── Rooms ───────────────────────────────────────────────────────────────────
create table if not exists public.rooms (
  id text primary key,
  number text not null,
  floor text not null default '1',
  name text not null,
  type text not null,
  description text not null default '',
  price numeric(10,2) not null default 0,
  capacity integer not null default 2,
  images jsonb not null default '[]'::jsonb,
  amenities jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  status text not null default 'Disponible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Reservations ────────────────────────────────────────────────────────────
create table if not exists public.reservations (
  id text primary key,
  room_id text not null references public.rooms(id) on delete restrict,
  room_name text not null,
  user_id text not null,
  user_name text not null,
  user_email text not null,
  user_phone text not null default '',
  check_in date not null,
  check_out date not null,
  guests integer not null default 1,
  total_price numeric(10,2) not null default 0,
  deposit_paid numeric(10,2),
  remaining_balance numeric(10,2),
  status text not null default 'pending',
  extras jsonb not null default '{"breakfast":false,"shuttle":false,"extraBed":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Reviews ─────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id text primary key,
  user_id text not null,
  user_name text not null,
  user_avatar_url text,
  room_id text,
  room_number text,
  room_name text,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  review_date date not null default current_date,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── Users (demo auth — use Supabase Auth in production) ─────────────────────
create table if not exists public.users (
  id text primary key,
  name text not null,
  email text not null unique,
  phone text not null default '',
  avatar_url text,
  role text not null default 'user',
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Hotel config (single row) ───────────────────────────────────────────────
create table if not exists public.hotel_config (
  id text primary key default 'default',
  name text not null,
  address text not null,
  phone text not null,
  email text not null,
  whatsapp text not null,
  description text,
  facebook text,
  instagram text,
  logo text,
  updated_at timestamptz not null default now()
);

-- ─── Gallery ─────────────────────────────────────────────────────────────────
create table if not exists public.gallery_images (
  id text primary key,
  url text not null,
  title text not null,
  created_at timestamptz not null default now()
);

-- ─── Invoices ────────────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id text primary key,
  reservation_id text not null,
  type text not null,
  client_name text not null,
  client_document text not null,
  room_number text not null,
  check_in date not null,
  check_out date not null,
  subtotal numeric(10,2) not null,
  extras jsonb not null default '[]'::jsonb,
  total numeric(10,2) not null,
  invoice_date date not null default current_date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ─── Complaints ──────────────────────────────────────────────────────────────
create table if not exists public.complaints (
  id text primary key,
  complaint_date date not null default current_date,
  full_name text not null,
  document_type text not null,
  document_number text not null,
  email text not null,
  phone text not null,
  address text not null,
  type text not null,
  description text not null,
  status text not null default 'Pendiente',
  created_at timestamptz not null default now()
);

-- ─── Tenants (SaaS) ──────────────────────────────────────────────────────────
create table if not exists public.tenants (
  id text primary key,
  name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  ruc text not null default '',
  razon_social text,
  ruc_status text,
  permissions jsonb,
  plan text not null,
  status text not null default 'Activo',
  created_at timestamptz not null default now(),
  next_billing_date timestamptz not null,
  monthly_fee numeric(10,2) not null default 0,
  theme jsonb not null default '{}'::jsonb
);

-- ─── Tenant invoices ─────────────────────────────────────────────────────────
create table if not exists public.tenant_invoices (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  tenant_name text not null,
  invoice_date date not null,
  due_date date not null,
  amount numeric(10,2) not null,
  status text not null default 'Pendiente',
  plan text not null,
  created_at timestamptz not null default now()
);

-- ─── Global SaaS config (single row) ─────────────────────────────────────────
create table if not exists public.global_config (
  id text primary key default 'default',
  platform_name text not null,
  support_email text not null,
  support_phone text not null,
  default_currency text not null default 'PEN',
  plans jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─── Updated_at triggers ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists rooms_updated_at on public.rooms;
create trigger rooms_updated_at before update on public.rooms
  for each row execute function public.set_updated_at();

drop trigger if exists reservations_updated_at on public.reservations;
create trigger reservations_updated_at before update on public.reservations
  for each row execute function public.set_updated_at();

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- ─── Row Level Security (demo — open policies) ────────────────────────────────
-- Tighten these policies before production.
alter table public.rooms enable row level security;
alter table public.reservations enable row level security;
alter table public.reviews enable row level security;
alter table public.users enable row level security;
alter table public.hotel_config enable row level security;
alter table public.gallery_images enable row level security;
alter table public.invoices enable row level security;
alter table public.complaints enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_invoices enable row level security;
alter table public.global_config enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'rooms','reservations','reviews','users','hotel_config',
    'gallery_images','invoices','complaints','tenants',
    'tenant_invoices','global_config'
  ]
  loop
    execute format('drop policy if exists lumina_public_all on public.%I', t);
    execute format(
      'create policy lumina_public_all on public.%I for all using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_reservations_room_id on public.reservations(room_id);
create index if not exists idx_reservations_status on public.reservations(status);
create index if not exists idx_reviews_approved on public.reviews(approved);
create index if not exists idx_users_email on public.users(email);
