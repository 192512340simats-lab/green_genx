-- =====================================================================
-- GREEN GENX | Migration 0002 | Atomic rate limiting
-- Run in Supabase SQL Editor AFTER 0001_schema.sql.
-- Used by the server for admin login, registration and status lookups.
-- Only the service_role (our server code) can call these functions.
-- =====================================================================

-- Registers one attempt for p_key. Returns whether it is allowed and, if
-- not, how many seconds until the caller may try again.
--   p_max             attempts allowed per window
--   p_window_seconds  length of the counting window
--   p_block_seconds   how long to block after exceeding p_max
create or replace function public.rate_limit_hit(
  p_key            text,
  p_max            integer,
  p_window_seconds integer,
  p_block_seconds  integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  r      public.rate_limits%rowtype;
  now_ts timestamptz := now();
begin
  -- Make sure a row exists, then lock it so concurrent requests queue up.
  insert into public.rate_limits as rl (key, attempts, window_start)
  values (p_key, 0, now_ts)
  on conflict (key) do nothing;

  select * into r from public.rate_limits where public.rate_limits.key = p_key for update;

  -- Still blocked?
  if r.blocked_until is not null and r.blocked_until > now_ts then
    return query select false, ceil(extract(epoch from (r.blocked_until - now_ts)))::integer;
    return;
  end if;

  -- Block expired, or counting window expired: start fresh.
  if r.blocked_until is not null
     or r.window_start + make_interval(secs => p_window_seconds) <= now_ts then
    r.attempts := 0;
    r.window_start := now_ts;
    r.blocked_until := null;
  end if;

  r.attempts := r.attempts + 1;

  if r.attempts > p_max then
    update public.rate_limits
       set attempts = r.attempts,
           window_start = r.window_start,
           blocked_until = now_ts + make_interval(secs => p_block_seconds)
     where public.rate_limits.key = p_key;
    return query select false, p_block_seconds;
    return;
  end if;

  update public.rate_limits
     set attempts = r.attempts,
         window_start = r.window_start,
         blocked_until = null
   where public.rate_limits.key = p_key;

  -- Occasional housekeeping so the table never grows without bound.
  if random() < 0.02 then
    delete from public.rate_limits
     where window_start < now_ts - interval '1 day'
       and (blocked_until is null or blocked_until < now_ts);
  end if;

  return query select true, 0;
end;
$$;

-- Clears a key (used after a successful admin login).
create or replace function public.rate_limit_reset(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where key = p_key;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.rate_limit_reset(text) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer, integer) to service_role;
grant execute on function public.rate_limit_reset(text) to service_role;
