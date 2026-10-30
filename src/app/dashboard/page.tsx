import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicSupabaseConfigurationError } from "@/lib/server-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public event dashboard",
  description: "Event information and the total number of registered Green GenX teams.",
};

export default async function PublicDashboardPage() {
  const configurationError = publicSupabaseConfigurationError();
  if (configurationError) {
    return (
      <main className="container-page py-16">
        <p role="alert" className="rounded-xl bg-amber-50 p-5 text-sm text-amber-900">
          The public dashboard is unavailable because its data connection is not configured: {configurationError}
        </p>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: event, error: eventError }, { data: registeredTeams, error: countError }] = await Promise.all([
    supabase
      .from("event_settings")
      .select("event_name, event_date, venue, duration_text, registration_open, registration_deadline")
      .eq("id", 1)
      .single(),
    supabase.rpc("public_registration_team_count"),
  ]);

  if (eventError || !event) {
    throw new Error(`Could not load public event information: ${eventError?.message ?? "No settings row found."}`);
  }
  if (countError) console.error("public dashboard team count lookup failed:", countError.message);
  const countAvailable = !countError && registeredTeams !== null;

  const eventDate = new Date(event.event_date);
  const eventDateLabel = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(eventDate);
  const deadlinePassed = event.registration_deadline
    ? new Date(event.registration_deadline).getTime() < Date.now()
    : false;
  const registrationOpen = event.registration_open && !deadlinePassed;

  return (
    <main className="min-h-screen bg-brand-50/60">
      <header className="border-b border-brand-100 bg-white">
        <div className="container-page flex h-20 items-center justify-between gap-4">
          <Link href="/" className="brand-lockup" aria-label="Green GenX home">
            <span className="brand-mark" aria-hidden="true">G</span>
            <span className="font-display text-xl font-extrabold tracking-tight text-brand-900">GREEN GEN_X</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-ink-soft hover:text-brand-800">Back to website</Link>
        </div>
      </header>

      <section className="container-page py-12 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow eyebrow-dark">Public event dashboard</p>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-brand-950 sm:text-4xl">{event.event_name}</h1>
              <p className="mt-3 text-lg text-ink-soft">DEPARTMENT OF ENVIRONMENTAL BIOTECHNOLOGY · SIMATS ENGINEERING</p>
            </div>
            <span className={`status-pill ${registrationOpen ? "status-approved" : "status-rejected"}`}>
              {registrationOpen ? "Registration open" : "Registration closed"}
            </span>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-[1.4fr_0.8fr]">
            <section className="card">
              <h2 className="font-display text-lg font-semibold text-brand-950">Event information</h2>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Date</dt>
                  <dd className="mt-1 font-semibold text-brand-900">{eventDateLabel}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Duration</dt>
                  <dd className="mt-1 font-semibold text-brand-900">{event.duration_text}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Venue</dt>
                  <dd className="mt-1 font-semibold text-brand-900">{event.venue}</dd>
                </div>
              </dl>
            </section>

            <section className="card flex flex-col justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-brand-950">Teams registered</h2>
                <p className="mt-3 font-display text-5xl font-bold tracking-tight text-brand-800">{countAvailable ? registeredTeams : "—"}</p>
                <p className="mt-2 text-sm text-ink-soft">Total team applications received</p>
                {!countAvailable && <p role="status" className="mt-3 text-xs leading-5 text-amber-800">Team totals are temporarily unavailable. Confirm Supabase migration 0004 has been applied.</p>}
              </div>
              {registrationOpen && <Link href="/register" className="btn-primary mt-6 w-full">Register your team <span aria-hidden="true">↗</span></Link>}
            </section>
          </div>

          <p className="mt-6 text-center text-xs text-ink-mute">
            This public page shows event information and aggregate team totals only. Participant and payment details are not displayed.
          </p>
        </div>
      </section>
    </main>
  );
}
