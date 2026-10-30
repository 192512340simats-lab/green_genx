import Link from "next/link";
import type { Registration } from "@/lib/types";

type RegistrationListItem = Pick<Registration, "id" | "registration_code" | "category" | "team_name" | "college_name" | "member_count" | "status" | "created_at">;

export default function RegistrationTable({ rows, emptyMessage }: { rows: RegistrationListItem[]; emptyMessage: string }) {
  if (!rows.length) {
    return <div className="card py-12 text-center text-sm text-ink-soft">{emptyMessage}</div>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white shadow-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-brand-100 bg-brand-50/70 text-xs uppercase tracking-wider text-ink-mute">
          <tr><th className="px-5 py-4 font-semibold">Team</th><th className="px-5 py-4 font-semibold">Registration ID</th><th className="px-5 py-4 font-semibold">Members</th><th className="px-5 py-4 font-semibold">Submitted</th><th className="px-5 py-4 font-semibold">Status</th><th className="px-5 py-4" /></tr>
        </thead>
        <tbody className="divide-y divide-brand-50">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-brand-50/40">
              <td className="px-5 py-4"><span className="font-semibold text-brand-950">{row.team_name}</span><span className="mt-1 block text-xs text-ink-mute">{row.college_name}</span></td>
              <td className="px-5 py-4 font-mono text-xs text-ink-soft">{row.registration_code}</td>
              <td className="px-5 py-4 text-ink-soft">{row.member_count}</td>
              <td className="px-5 py-4 text-ink-soft">{new Date(row.created_at).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}</td>
              <td className="px-5 py-4"><span className={`status-pill status-${row.status}`}>{row.status}</span></td>
              <td className="px-5 py-4 text-right"><Link href={`/admin/${row.category}/${row.id}`} className="font-semibold text-brand-700 hover:text-brand-900">Review <span aria-hidden="true">→</span></Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
