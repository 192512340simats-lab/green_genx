import { requireAdminPage } from "@/lib/auth";
import RegistrationTable from "@/components/admin/RegistrationTable";

export const dynamic = "force-dynamic";

export default async function ExternalTeamsPage() {
  const { supabase } = await requireAdminPage();
  const { data, error } = await supabase.from("registrations").select("id, registration_code, category, team_name, college_name, member_count, status, created_at").eq("category", "external").order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load external registrations: ${error.message}`);
  return <section><p className="eyebrow eyebrow-dark">Applications</p><h1 className="mt-2 font-display text-3xl font-semibold text-brand-950">External teams</h1><p className="mt-2 text-sm text-ink-soft">Review applications and verify payment proof before approval.</p><div className="mt-6"><RegistrationTable rows={data ?? []} emptyMessage="No external team registrations yet." /></div></section>;
}
