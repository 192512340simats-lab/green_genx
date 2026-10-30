-- Expose only an aggregate team count to the public dashboard.
-- Registration rows remain protected by RLS; no individual fields are returned.
create or replace function public.public_registration_team_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.registrations;
$$;

revoke all on function public.public_registration_team_count() from public, anon, authenticated;
grant execute on function public.public_registration_team_count() to anon, authenticated;
