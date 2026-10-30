import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdminPage();
  const [{ data: registrations, error: registrationsError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from("registrations").select("category, status, payment_status, total_fee, member_count"),
    supabase.from("event_settings").select("registration_open, registration_deadline, external_fee_per_member").eq("id", 1).single(),
  ]);
  if (registrationsError) throw new Error(`Could not load registration overview: ${registrationsError.message}`);
  if (settingsError) throw new Error(`Could not load event settings: ${settingsError.message}`);

  const rows = registrations ?? [];
  const internalRows = rows.filter((row) => row.category === "internal");
  const externalRows = rows.filter((row) => row.category === "external");
  const pendingRows = rows.filter((row) => row.status === "pending");
  const approvedRows = rows.filter((row) => row.status === "approved");
  const pendingExternalRows = externalRows.filter((row) => row.payment_status === "pending");
  const pendingExternalMembers = pendingExternalRows.reduce((total, row) => total + row.member_count, 0);
  const pendingExternalAmount = pendingExternalRows.reduce((total, row) => total + row.total_fee, 0);
  const externalMembers = externalRows.reduce((total, row) => total + row.member_count, 0);
  const externalAmount = externalRows.reduce((total, row) => total + row.total_fee, 0);
  const stats = [
    { label: "Total applications", value: rows.length, detail: "All categories · View all teams", href: "/admin/teams" },
    { label: "Awaiting review", value: pendingRows.length, detail: "Needs organizer action · Review requests", href: "/admin/teams?status=pending" },
    { label: "Approved", value: approvedRows.length, detail: "Ready for the event · View approved teams", href: "/admin/teams?status=approved" },
    {
      label: "External payments",
      value: pendingExternalRows.length,
      detail: `${pendingExternalMembers} members · ₹${pendingExternalAmount.toLocaleString("en-IN")} awaiting verification`,
      href: "/admin/teams?category=external&payment=pending",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow eyebrow-dark">Organizer workspace</p><h1 className="mt-2 font-display text-3xl font-semibold text-brand-950">Overview</h1></div>
        <span className={`status-pill ${settings.registration_open ? "status-approved" : "status-rejected"}`}>{settings.registration_open ? "Registration open" : "Registration closed"}</span>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="card group transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          >
            <p className="text-sm font-medium text-ink-soft">{stat.label}</p>
            <p className="mt-3 font-display text-4xl font-semibold text-brand-900">{stat.value}</p>
            <p className="mt-2 text-xs text-ink-mute">{stat.detail}</p>
            <span className="sr-only">Open matching teams</span>
          </Link>
        ))}
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card">
          <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold text-brand-950">Registration queue</h2><Link href="/admin/internal" className="text-sm font-semibold text-brand-700 hover:text-brand-900">View teams →</Link></div>
          <p className="mt-2 text-sm leading-6 text-ink-soft">Review applications, verify external payments, and update team decisions.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link href="/admin/internal" className="rounded-xl border border-brand-100 p-4 hover:bg-brand-50"><span className="font-semibold text-brand-900">Internal teams</span><span className="mt-1 block text-sm text-ink-mute">{internalRows.length} applications</span></Link>
            <Link href="/admin/external" className="rounded-xl border border-brand-100 p-4 hover:bg-brand-50"><span className="font-semibold text-brand-900">External teams</span><span className="mt-1 block text-sm text-ink-mute">{externalRows.length} applications · {externalMembers} members · ₹{externalAmount.toLocaleString("en-IN")} total</span></Link>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold text-brand-950">Event setup</h2><Link href="/admin/settings" className="text-sm font-semibold text-brand-700 hover:text-brand-900">Edit →</Link></div>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-ink-mute">External fee per member</dt><dd className="font-semibold text-brand-900">₹{settings.external_fee_per_member}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-mute">Registration deadline</dt><dd className="font-semibold text-brand-900">{settings.registration_deadline ? new Date(settings.registration_deadline).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }) : "Not set"}</dd></div>
          </dl>
          <Link href="/api/admin/export" className="btn-secondary mt-6 w-full">Export registrations (.xlsx)</Link>
        </div>
      </section>
    </div>
  );
}
