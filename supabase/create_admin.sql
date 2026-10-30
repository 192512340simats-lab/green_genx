-- Secure initial admin setup (run AFTER 0001_schema.sql)
--
-- 1. Supabase Dashboard -> Authentication -> Providers -> Email:
--    keep Email enabled and TURN OFF "Allow new users to sign up"
--    (so nobody can create accounts from the public internet).
-- 2. Dashboard -> Authentication -> Users -> "Add user" -> "Create new user".
--    Enter the organizer's email, use a strong initial password, and tick
--    "Auto Confirm User". The organizer signs in using the email magic link.
-- 3. Replace the email below with that same email and run this script.

insert into public.admin_profiles (user_id, email, full_name)
select id, email, 'Organizer'
from auth.users
where email = 'REPLACE_WITH_ADMIN_EMAIL@example.com'
on conflict (user_id) do nothing;

-- Verify:
select * from public.admin_profiles;
