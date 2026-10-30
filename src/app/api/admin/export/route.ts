import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { data: registrations, error } = await auth.admin.supabase
    .from("registrations")
    .select("id, registration_code, category, team_name, leader_name, college_name, department, year_of_study, project_title, leader_reg_no, member_count, fee_per_member, total_fee, transaction_id, payment_date, payment_time, payment_status, status, rejection_reason, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("registration export lookup failed:", error.message);
    return NextResponse.json({ error: "Could not export registrations." }, { status: 503 });
  }

  const ids = (registrations ?? []).map((row) => row.id);
  const { data: members, error: membersError } = ids.length
    ? await auth.admin.supabase.from("team_members").select("registration_id, position, full_name, email, phone").in("registration_id", ids).order("position")
    : { data: [], error: null };
  if (membersError) {
    console.error("registration export members lookup failed:", membersError.message);
    return NextResponse.json({ error: "Could not export team member details." }, { status: 503 });
  }

  const byRegistration = new Map<string, string[]>();
  for (const member of members ?? []) {
    const list = byRegistration.get(member.registration_id) ?? [];
    list.push(`${member.position}. ${member.full_name} (${member.email}, ${member.phone})`);
    byRegistration.set(member.registration_id, list);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Green GenX";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Registrations", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Registration ID", key: "code", width: 25 },
    { header: "Category", key: "category", width: 14 },
    { header: "Team name", key: "team", width: 25 },
    { header: "Leader", key: "leader", width: 24 },
    { header: "College", key: "college", width: 32 },
    { header: "Department", key: "department", width: 22 },
    { header: "Year", key: "year", width: 10 },
    { header: "Project", key: "project", width: 36 },
    { header: "Members", key: "members", width: 64 },
    { header: "Leader registration number", key: "regNo", width: 26 },
    { header: "Member count", key: "memberCount", width: 14 },
    { header: "Fee per member", key: "fee", width: 16 },
    { header: "Total fee", key: "total", width: 14 },
    { header: "Transaction ID", key: "transaction", width: 24 },
    { header: "Payment date", key: "paymentDate", width: 16 },
    { header: "Payment time", key: "paymentTime", width: 16 },
    { header: "Payment status", key: "paymentStatus", width: 18 },
    { header: "Application status", key: "status", width: 18 },
    { header: "Rejection reason", key: "rejection", width: 36 },
    { header: "Submitted at", key: "created", width: 25 },
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B4332" } };
  for (const row of registrations ?? []) {
    sheet.addRow({
      code: row.registration_code,
      category: row.category,
      team: row.team_name,
      leader: row.leader_name,
      college: row.college_name,
      department: row.department,
      year: row.year_of_study,
      project: row.project_title,
      members: (byRegistration.get(row.id) ?? []).join("\n"),
      regNo: row.leader_reg_no ?? "",
      memberCount: row.member_count,
      fee: row.fee_per_member,
      total: row.total_fee,
      transaction: row.transaction_id ?? "",
      paymentDate: row.payment_date ?? "",
      paymentTime: row.payment_time ?? "",
      paymentStatus: row.payment_status,
      status: row.status,
      rejection: row.rejection_reason ?? "",
      created: row.created_at,
    });
  }
  sheet.autoFilter = { from: "A1", to: "T1" };
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="green-genx-registrations.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
