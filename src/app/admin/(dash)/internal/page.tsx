import { requireAdminPage } from "@/lib/auth";
import RegistrationTable from "@/components/admin/RegistrationTable";

export const dynamic = "force-dynamic";

export default async function InternalTeamsPage() {
  const { supabase } = await requireAdminPage();
  const { data, error } = await supabase.from("registrations").select("id, registration_code, category, team_name, college_name, member_count, status, created_at").eq("category", "internal").order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load internal registrations: ${error.message}`);
  return <section><p className="eyebrow eyebrow-dark">Applications</p><h1 className="mt-2 font-display text-3xl font-semibold text-brand-950">Internal teams</h1><p className="mt-2 text-sm text-ink-soft">Review student teams from SIMATS institutions.</p><div className="mt-6"><RegistrationTable rows={data ?? []} emptyMessage="No internal team registrations yet." /></div></section>;
}
