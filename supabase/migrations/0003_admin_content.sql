-- Replace editable public event content atomically.
-- Called by an authenticated organizer; RLS still applies to every row change.
create or replace function public.replace_event_content(
  p_objectives jsonb,
  p_themes jsonb,
  p_schedule jsonb,
  p_rules jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if jsonb_typeof(p_objectives) is distinct from 'array'
    or jsonb_typeof(p_themes) is distinct from 'array'
    or jsonb_typeof(p_schedule) is distinct from 'array'
    or jsonb_typeof(p_rules) is distinct from 'array' then
    raise exception 'content values must be arrays' using errcode = '22023';
  end if;

  delete from public.objectives;
  insert into public.objectives (body, sort_order)
  select item->>'body', ordinal::integer
  from jsonb_array_elements(p_objectives) with ordinality as entries(item, ordinal);

  delete from public.themes;
  insert into public.themes (title, description, sort_order)
  select item->>'title', item->>'description', ordinal::integer
  from jsonb_array_elements(p_themes) with ordinality as entries(item, ordinal);

  delete from public.schedule_items;
  insert into public.schedule_items (time_label, title, description, sort_order)
  select item->>'time_label', item->>'title', item->>'description', ordinal::integer
  from jsonb_array_elements(p_schedule) with ordinality as entries(item, ordinal);

  delete from public.rules;
  insert into public.rules (body, sort_order)
  select item->>'body', ordinal::integer
  from jsonb_array_elements(p_rules) with ordinality as entries(item, ordinal);
end;
$$;

revoke all on function public.replace_event_content(jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.replace_event_content(jsonb, jsonb, jsonb, jsonb) to authenticated;
