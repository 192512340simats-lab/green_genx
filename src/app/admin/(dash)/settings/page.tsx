import { requireAdminPage } from "@/lib/auth";
import SettingsForm from "@/components/admin/SettingsForm";
import ContentEditor from "@/components/admin/ContentEditor";
import type { EventSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdminPage();
  const [
    { data, error },
    { data: objectives, error: objectivesError },
    { data: themes, error: themesError },
    { data: schedule, error: scheduleError },
    { data: rules, error: rulesError },
  ] = await Promise.all([
    supabase.from("event_settings").select("*").eq("id", 1).single(),
    supabase.from("objectives").select("body").order("sort_order"),
    supabase.from("themes").select("title, description").order("sort_order"),
    supabase.from("schedule_items").select("time_label, title, description").order("sort_order"),
    supabase.from("rules").select("body").order("sort_order"),
  ]);
  if (error || !data) throw new Error(`Could not load event settings: ${error?.message ?? "No settings row found."}`);
  if (objectivesError || themesError || scheduleError || rulesError) {
    throw new Error(`Could not load public website content: ${objectivesError?.message ?? themesError?.message ?? scheduleError?.message ?? rulesError?.message}`);
  }
  const qrUrl = data.payment_qr_path
    ? supabase.storage.from("site-assets").getPublicUrl(data.payment_qr_path).data.publicUrl
    : null;
  return <section><p className="eyebrow eyebrow-dark">Configure your event</p><h1 className="mt-2 font-display text-3xl font-semibold text-brand-950">Settings</h1><p className="mb-6 mt-2 text-sm text-ink-soft">Manage event information, registration availability, payment, organizer contact details, and public page content.</p><SettingsForm settings={data as EventSettings} initialQrUrl={qrUrl} /><div className="mt-10"><ContentEditor objectives={(objectives ?? []).map((item) => item.body)} themes={themes ?? []} schedule={schedule ?? []} rules={(rules ?? []).map((item) => item.body)} /></div></section>;
}
