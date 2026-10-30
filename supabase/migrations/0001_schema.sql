-- =====================================================================
-- GREEN GENX  |  Migration 0001  |  Schema, functions, RLS, storage
-- Run once in Supabase Dashboard -> SQL Editor.
-- All participant writes go through server code using the service-role
-- key (which bypasses RLS). Browsers (anon/authenticated) can only do
-- what the policies below explicitly allow.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type participant_category as enum ('internal', 'external');
exception when duplicate_object then null; end $$;

do $$ begin
  create type registration_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('not_required', 'pending', 'verified');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Admin profiles (explicit allow-list of administrators)
-- ---------------------------------------------------------------------
create table if not exists public.admin_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so policies can check admin status without recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_profiles where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Event settings (single row, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.event_settings (
  id                    smallint primary key default 1 check (id = 1),
  event_name            text not null default 'GREEN GENX',
  tagline               text not null default 'Where Green Ideas Meet Technology',
  about                 text not null default '',
  event_date            timestamptz not null default '2026-11-19T09:00:00+05:30',
  venue                 text not null default 'SIMATS Engineering Premises',
  duration_text         text not null default '8 Hours',
  registration_open     boolean not null default true,
  registration_deadline timestamptz,
  external_fee_per_member integer not null default 100 check (external_fee_per_member >= 0),
  payment_upi_id        text not null default '',
  payment_instructions  text not null default '',
  payment_qr_path       text,                      -- path in public 'site-assets' bucket
  contact_name          text not null default '',
  contact_phone         text not null default '',
  contact_email         text not null default '',
  instagram_url         text not null default '',
  updated_at            timestamptz not null default now()
);

insert into public.event_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Public content tables
-- ---------------------------------------------------------------------
create table if not exists public.objectives (
  id         uuid primary key default gen_random_uuid(),
  body       text not null,
  sort_order integer not null default 0
);

create table if not exists public.themes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  sort_order  integer not null default 0
);

create table if not exists public.schedule_items (
  id          uuid primary key default gen_random_uuid(),
  time_label  text not null,
  title       text not null,
  description text not null default '',
  sort_order  integer not null default 0
);

create table if not exists public.rules (
  id         uuid primary key default gen_random_uuid(),
  body       text not null,
  sort_order integer not null default 0
);

-- ---------------------------------------------------------------------
-- Atomic registration-ID counters
-- ---------------------------------------------------------------------
create table if not exists public.registration_counters (
  category   participant_category not null,
  year       integer not null,
  last_value integer not null default 0,
  primary key (category, year)
);

-- Atomically returns e.g. GGX-INT-2026-001. Row lock via ON CONFLICT
-- guarantees unique, gap-tolerant IDs even under simultaneous submissions.
create or replace function public.next_registration_code(p_category participant_category, p_year integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
  v_tag  text := case p_category when 'internal' then 'INT' else 'EXT' end;
begin
  insert into public.registration_counters (category, year, last_value)
  values (p_category, p_year, 1)
  on conflict (category, year)
  do update set last_value = public.registration_counters.last_value + 1
  returning last_value into v_next;

  return format('GGX-%s-%s-%s', v_tag, p_year, lpad(v_next::text, 3, '0'));
end;
$$;

revoke all on function public.next_registration_code(participant_category, integer) from public, anon, authenticated;
grant execute on function public.next_registration_code(participant_category, integer) to service_role;

-- ---------------------------------------------------------------------
-- Registrations
-- ---------------------------------------------------------------------
create table if not exists public.registrations (
  id                    uuid primary key default gen_random_uuid(),
  registration_code     text not null unique,
  category              participant_category not null,

  team_name             text not null check (char_length(team_name) between 2 and 80),
  leader_name           text not null check (char_length(leader_name) between 2 and 100),
  college_name          text not null,
  department            text not null,
  year_of_study         smallint not null check (year_of_study between 1 and 6),
  project_title         text not null check (char_length(project_title) between 2 and 150),

  -- INTERNAL only
  leader_reg_no         text,
  leader_id_card_path   text,                      -- private bucket path

  -- EXTERNAL only
  member_count          smallint not null check (member_count between 3 and 4),
  fee_per_member        integer not null default 0 check (fee_per_member >= 0),
  total_fee             integer not null default 0 check (total_fee >= 0),
  transaction_id        text,
  payment_date          date,
  payment_time          time,
  payment_screenshot_path text,                    -- private bucket path
  payment_status        payment_status not null default 'not_required',

  status                registration_status not null default 'pending',
  rejection_reason      text,

  -- Public status lookup: only a SHA-256 hash of the random token is stored.
  status_token_hash     text not null,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Category-specific integrity rules
  constraint internal_rules check (
    category <> 'internal' or (
      leader_reg_no is not null and leader_id_card_path is not null
      and total_fee = 0 and fee_per_member = 0
      and transaction_id is null and payment_date is null
      and payment_time is null and payment_screenshot_path is null
      and payment_status = 'not_required'
    )
  ),
  constraint external_rules check (
    category <> 'external' or (
      transaction_id is not null and payment_date is not null
      and payment_time is not null and payment_screenshot_path is not null
      and payment_status in ('pending', 'verified')
      and total_fee = fee_per_member * member_count
    )
  ),
  constraint approval_rules check (
    status <> 'approved' or category = 'internal' or payment_status = 'verified'
  ),
  constraint rejection_reason_required check (
    status <> 'rejected' or (rejection_reason is not null and char_length(btrim(rejection_reason)) > 0)
  )
);

-- Duplicate-registration protection
create unique index if not exists uq_reg_team_per_category
  on public.registrations (category, lower(btrim(team_name)));
create unique index if not exists uq_reg_internal_leader_regno
  on public.registrations (lower(btrim(leader_reg_no))) where leader_reg_no is not null;
create unique index if not exists uq_reg_transaction_id
  on public.registrations (lower(btrim(transaction_id))) where transaction_id is not null;

create index if not exists idx_reg_category_status on public.registrations (category, status);
create index if not exists idx_reg_created_at on public.registrations (created_at desc);
create index if not exists idx_reg_token_hash on public.registrations (status_token_hash);

-- ---------------------------------------------------------------------
-- Team members (leader is position 1)
-- ---------------------------------------------------------------------
create table if not exists public.team_members (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  position        smallint not null check (position between 1 and 4),
  full_name       text not null check (char_length(full_name) between 2 and 100),
  email           text not null,
  phone           text not null,
  is_leader       boolean not null default false,
  unique (registration_id, position),
  constraint leader_is_first check ((position = 1) = is_leader)
);

create index if not exists idx_members_reg on public.team_members (registration_id);

-- ---------------------------------------------------------------------
-- Status history
-- ---------------------------------------------------------------------
create table if not exists public.registration_status_history (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  old_status      registration_status,
  new_status      registration_status not null,
  note            text,
  changed_by      uuid references auth.users(id),
  changed_at      timestamptz not null default now()
);

create index if not exists idx_history_reg on public.registration_status_history (registration_id, changed_at desc);

-- ---------------------------------------------------------------------
-- Rate-limit store for login / public lookups (server-only)
-- ---------------------------------------------------------------------
create table if not exists public.rate_limits (
  key          text primary key,
  attempts     integer not null default 0,
  window_start timestamptz not null default now(),
  blocked_until timestamptz
);

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_reg_touch on public.registrations;
create trigger trg_reg_touch before update on public.registrations
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_settings_touch on public.event_settings;
create trigger trg_settings_touch before update on public.event_settings
  for each row execute function public.touch_updated_at();

-- Log every status change automatically
create or replace function public.log_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.registration_status_history (registration_id, new_status, note)
    values (new.id, new.status, 'Registration submitted');
  elsif new.status is distinct from old.status then
    insert into public.registration_status_history (registration_id, old_status, new_status, note, changed_by)
    values (new.id, old.status, new.status, new.rejection_reason, auth.uid());
  end if;
  return new;
end; $$;

drop trigger if exists trg_reg_history on public.registrations;
create trigger trg_reg_history after insert or update on public.registrations
  for each row execute function public.log_status_change();

-- Internal teams are free: lock fee fields regardless of what the app sends
create or replace function public.enforce_internal_free()
returns trigger language plpgsql as $$
begin
  if new.category = 'internal' then
    new.fee_per_member := 0;
    new.total_fee := 0;
    new.payment_status := 'not_required';
  end if;
  return new;
end; $$;

drop trigger if exists trg_internal_free on public.registrations;
create trigger trg_internal_free before insert or update on public.registrations
  for each row execute function public.enforce_internal_free();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.admin_profiles               enable row level security;
alter table public.event_settings               enable row level security;
alter table public.objectives                   enable row level security;
alter table public.themes                       enable row level security;
alter table public.schedule_items               enable row level security;
alter table public.rules                        enable row level security;
alter table public.registration_counters        enable row level security;
alter table public.registrations                enable row level security;
alter table public.team_members                 enable row level security;
alter table public.registration_status_history  enable row level security;
alter table public.rate_limits                  enable row level security;

-- Admin profiles: an admin can read only their own row. No client writes
-- (create admins from the SQL editor; see README).
drop policy if exists "admin reads own profile" on public.admin_profiles;
create policy "admin reads own profile" on public.admin_profiles
  for select to authenticated using (user_id = auth.uid());

-- Public content: world-readable, admin-writable.
do $$
declare t text;
begin
  foreach t in array array['event_settings','objectives','themes','schedule_items','rules']
  loop
    execute format('drop policy if exists "public read %1$s" on public.%1$s', t);
    execute format('create policy "public read %1$s" on public.%1$s for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "admin write %1$s" on public.%1$s', t);
    execute format('create policy "admin write %1$s" on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Registrations / members / history: admin only. Public users get NO policy,
-- so they can read nothing. Public status lookups happen server-side.
drop policy if exists "admin all registrations" on public.registrations;
create policy "admin all registrations" on public.registrations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all members" on public.team_members;
create policy "admin all members" on public.team_members
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin read history" on public.registration_status_history;
create policy "admin read history" on public.registration_status_history
  for select to authenticated using (public.is_admin());

-- registration_counters and rate_limits: no policies => service role only.

-- ---------------------------------------------------------------------
-- Storage buckets and policies
-- ---------------------------------------------------------------------
-- Private bucket for ID cards + payment screenshots (never public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('participant-docs', 'participant-docs', false, 3145728,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 3145728,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Public bucket ONLY for the payment QR code and site images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- participant-docs: ONLY admins may read via the API. Uploads are done by
-- the server with the service-role key, so no insert policy is granted.
drop policy if exists "admins read participant docs" on storage.objects;
create policy "admins read participant docs" on storage.objects
  for select to authenticated
  using (bucket_id = 'participant-docs' and public.is_admin());

-- site-assets: admins manage; everyone can read (bucket is public).
drop policy if exists "admins insert site assets" on storage.objects;
create policy "admins insert site assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-assets' and public.is_admin());

drop policy if exists "admins update site assets" on storage.objects;
create policy "admins update site assets" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-assets' and public.is_admin());

drop policy if exists "admins delete site assets" on storage.objects;
create policy "admins delete site assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-assets' and public.is_admin());

-- ---------------------------------------------------------------------
-- Seed content (editable later from the admin dashboard)
-- ---------------------------------------------------------------------
insert into public.objectives (body, sort_order)
select * from (values
  ('Encourage students to build technology-driven solutions for environmental challenges.', 1),
  ('Promote sustainable thinking across engineering disciplines.', 2),
  ('Provide a collaborative platform for teams from different colleges.', 3),
  ('Connect innovative green ideas with practical engineering.', 4)
) v(body, sort_order)
where not exists (select 1 from public.objectives);

insert into public.themes (title, description, sort_order)
select * from (values
  ('Renewable Energy', 'Clean power generation, storage and smart grids.', 1),
  ('Waste Management', 'Recycling, waste reduction and circular economy.', 2),
  ('Smart Agriculture', 'Technology for sustainable farming.', 3),
  ('Water Conservation', 'Monitoring, purification and efficient usage.', 4),
  ('Green Mobility', 'Electric and low-emission transportation.', 5),
  ('Sustainable Cities', 'Eco-friendly infrastructure and IoT.', 6)
) v(title, description, sort_order)
where not exists (select 1 from public.themes);

insert into public.schedule_items (time_label, title, description, sort_order)
select * from (values
  ('09:00 AM', 'Registration & Check-in', 'Gate pass verification and team seating.', 1),
  ('10:00 AM', 'Inauguration', 'Welcome and event briefing.', 2),
  ('10:30 AM', 'Hacking Begins', 'Teams start building.', 3),
  ('01:00 PM', 'Lunch Break', '', 4),
  ('04:00 PM', 'Final Presentations', 'Teams present their projects.', 5),
  ('05:00 PM', 'Closing Ceremony', '', 6)
) v(time_label, title, description, sort_order)
where not exists (select 1 from public.schedule_items);

insert into public.rules (body, sort_order)
select * from (values
  ('Teams must have 3 to 4 members.', 1),
  ('Every participant must carry a valid college ID card.', 2),
  ('Each team must present its gate pass at entry.', 3),
  ('Teams must follow the instructions of the organizers.', 4),
  ('Decisions of the organizing committee are final.', 5)
) v(body, sort_order)
where not exists (select 1 from public.rules);
