-- Speeds up the organizer's status/category filters while preserving RLS.
create index if not exists idx_reg_status_created
  on public.registrations (status, created_at desc);

create index if not exists idx_reg_category_created
  on public.registrations (category, created_at desc);

create index if not exists idx_reg_category_payment_created
  on public.registrations (category, payment_status, created_at desc);
