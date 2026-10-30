import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import type { Registration, StatusHistoryRow, TeamMember } from "@/lib/types";
import RegistrationActions from "@/components/admin/RegistrationActions";
import PrivateDocument from "@/components/admin/PrivateDocument";
import EditRegistrationForm from "@/components/admin/EditRegistrationForm";

export default async function RegistrationDetail({ id, category }: { id: string; category: "internal" | "external" }) {
  const { supabase } = await requireAdminPage();
  const { data: registration, error: registrationError } = await supabase
    .from("registrations")
    .select("id, registration_code, category, team_name, leader_name, college_name, department, year_of_study, project_title, leader_reg_no, member_count, total_fee, transaction_id, payment_date, payment_time, payment_status, status, rejection_reason, created_at")
    .eq("id", id)
    .eq("category", category)
    .maybeSingle();
  if (registrationError) throw new Error(`Could not load registration: ${registrationError.message}`);
  if (!registration) notFound();

  const [{ data: members, error: membersError }, { data: history, error: historyError }] = await Promise.all([
    supabase.from("team_members").select("id, position, full_name, email, phone, is_leader").eq("registration_id", id).order("position"),
    supabase.from("registration_status_history").select("id, new_status, note, changed_at").eq("registration_id", id).order("changed_at", { ascending: false }),
  ]);
  if (membersError) throw new Error(`Could not load team members: ${membersError.message}`);
  if (historyError) throw new Error(`Could not load status history: ${historyError.message}`);

  const row = registration as Registration;
  return (
    <div>
      <Link href={`/admin/${category}`} className="text-sm font-semibold text-brand-700 hover:text-brand-900">← Back to {category} teams</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div><p className="eyebrow eyebrow-dark capitalize">{category} application</p><h1 className="mt-2 font-display text-3xl font-semibold text-brand-950">{row.team_name}</h1><p className="mt-2 font-mono text-sm text-ink-soft">{row.registration_code}</p></div>
        <span className={`status-pill status-${row.status}`}>{row.status}</span>
      </div>

      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <section className="card">
            <h2 className="font-display text-lg font-semibold text-brand-950">Project & institution</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail label="Project idea" value={row.project_title} wide />
              <Detail label="College / institution" value={row.college_name} />
              <Detail label="Department" value={row.department} />
              <Detail label="Year of study" value={String(row.year_of_study)} />
              <Detail label="Team size" value={`${row.member_count} members`} />
              <Detail label="Submitted" value={new Date(row.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} />
              {category === "internal" && <Detail label="Leader registration number" value={row.leader_reg_no ?? "—"} />}
            </dl>
          </section>
          <section className="card">
            <h2 className="font-display text-lg font-semibold text-brand-950">Team members</h2>
            <div className="mt-4 divide-y divide-brand-100">
              {((members ?? []) as TeamMember[]).map((member) => (
                <div key={member.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-1">
                  <div><p className="font-semibold text-brand-950">{member.full_name} {member.is_leader && <span className="text-xs font-medium text-brand-600">· Leader</span>}</p><p className="mt-1 text-sm text-ink-soft">{member.email}</p></div>
                  <a className="text-sm text-brand-700" href={`tel:${member.phone}`}>{member.phone}</a>
                </div>
              ))}
            </div>
          </section>
          {category === "external" && <section className="card">
            <h2 className="font-display text-lg font-semibold text-brand-950">Payment review</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="Transaction ID" value={row.transaction_id ?? "—"} />
              <Detail label="Payment status" value={row.payment_status.replace("_", " ")} />
              <Detail label="Payment date" value={`${row.payment_date ?? "—"} ${row.payment_time ?? ""}`} />
              <Detail label="Amount submitted" value={`₹${row.total_fee}`} />
            </dl>
            <div className="mt-5"><PrivateDocument registrationId={row.id} kind="payment" label="Payment screenshot" /></div>
          </section>}
          {category === "internal" && <section className="card"><h2 className="font-display text-lg font-semibold text-brand-950">Leader ID card</h2><div className="mt-4"><PrivateDocument registrationId={row.id} kind="id_card" label="College ID card" /></div></section>}
          <section className="card">
            <h2 className="font-display text-lg font-semibold text-brand-950">Status history</h2>
            <ol className="mt-4 space-y-4">
              {((history ?? []) as StatusHistoryRow[]).map((entry) => <li key={entry.id} className="border-l-2 border-brand-200 pl-4"><p className="text-sm font-semibold capitalize text-brand-900">{entry.new_status}</p><p className="mt-1 text-xs text-ink-mute">{new Date(entry.changed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</p>{entry.note && <p className="mt-1 text-sm text-ink-soft">{entry.note}</p>}</li>)}
            </ol>
          </section>
        </div>
        <div className="space-y-5">
          <RegistrationActions id={row.id} category={row.category} status={row.status} paymentStatus={row.payment_status} />
          <EditRegistrationForm
            id={row.id}
            teamName={row.team_name}
            projectTitle={row.project_title}
            collegeName={row.college_name}
            department={row.department}
            yearOfStudy={row.year_of_study}
            leaderRegNo={row.category === "internal" ? row.leader_reg_no : null}
          />
          {row.status === "rejected" && row.rejection_reason && <div className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800"><strong>Rejection reason:</strong> {row.rejection_reason}</div>}
          {row.status === "approved" && <a className="btn-secondary w-full" href={`/api/gate-pass?code=${encodeURIComponent(row.registration_code)}`}>Download gate pass (PDF)</a>}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "sm:col-span-2" : ""}><dt className="text-xs font-medium text-ink-mute">{label}</dt><dd className="mt-1 break-words text-sm font-semibold capitalize text-brand-900">{value}</dd></div>;
}
