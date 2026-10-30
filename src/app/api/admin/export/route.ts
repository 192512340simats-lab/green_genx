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
    .select("id, category, college_name, department, total_fee, transaction_id, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("registration export lookup failed:", error.message);
    return NextResponse.json({ error: "Could not export registrations." }, { status: 503 });
  }

  const ids = (registrations ?? []).map((row) => row.id);
  const { data: members, error: membersError } = ids.length
    ? await auth.admin.supabase.from("team_members").select("registration_id, position, full_name, phone, is_leader").in("registration_id", ids).order("position")
    : { data: [], error: null };
  if (membersError) {
    console.error("registration export members lookup failed:", membersError.message);
    return NextResponse.json({ error: "Could not export team member details." }, { status: 503 });
  }

  const byRegistration = new Map<string, Array<{
    position: number;
    fullName: string;
    phone: string;
    isLeader: boolean;
  }>>();
  for (const member of members ?? []) {
    const list = byRegistration.get(member.registration_id) ?? [];
    list.push({
      position: member.position,
      fullName: member.full_name,
      phone: member.phone,
      isLeader: member.is_leader,
    });
    byRegistration.set(member.registration_id, list);
  }

  const registrationsWithoutMembers = (registrations ?? []).filter((row) => !byRegistration.has(row.id));
  if (registrationsWithoutMembers.length > 0) {
    console.error("registration export found registrations without team members:", registrationsWithoutMembers.length);
    return NextResponse.json({ error: "Could not export complete team member details." }, { status: 503 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Green GenX";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Registrations", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "S.NO", key: "serial", width: 8 },
    { header: "TIME STAMP", key: "timestamp", width: 24 },
    { header: "Mobile Number", key: "mobile", width: 25 },
    { header: "FULL NAME", key: "fullName", width: 30 },
    { header: "UNIVERSITY NAME", key: "university", width: 55 },
    { header: "DESIGNATION", key: "designation", width: 24 },
    { header: "TRANSACTION ID", key: "transactionId", width: 26 },
    { header: "AMOUNT", key: "amount", width: 14 },
  ];
  sheet.getRow(1).height = 24;
  sheet.getRow(1).font = { name: "Times New Roman", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B4332" } };
  sheet.getRow(1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  const istOffsetMilliseconds = 5.5 * 60 * 60 * 1000;
  for (const [registrationIndex, registration] of (registrations ?? []).entries()) {
    const teamMembers = (byRegistration.get(registration.id) ?? [])
      .sort((a, b) => Number(b.isLeader) - Number(a.isLeader) || a.position - b.position);

    for (const [memberIndex, member] of teamMembers.entries()) {
      const isLeader = memberIndex === 0;
      const row = sheet.addRow({
        serial: isLeader ? registrationIndex + 1 : null,
        timestamp: isLeader ? new Date(new Date(registration.created_at).getTime() + istOffsetMilliseconds) : null,
        mobile: member.phone,
        fullName: member.fullName,
        university: registration.college_name,
        designation: registration.department,
        transactionId: isLeader && registration.category === "external" ? registration.transaction_id ?? "" : "",
        amount: isLeader && registration.category === "external" ? registration.total_fee : null,
      });

      row.height = 22;
      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        cell.font = { name: "Times New Roman", size: 12, bold: isLeader && columnNumber === 4 };
        cell.alignment = {
          horizontal: columnNumber === 4 || columnNumber === 5 ? "left" : "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.border = {
          top: isLeader ? { style: "medium", color: { argb: "FF1B4332" } } : { style: "thin", color: { argb: "FFD9E2DC" } },
          left: { style: "thin", color: { argb: "FFD9E2DC" } },
          bottom: { style: "thin", color: { argb: "FFD9E2DC" } },
          right: { style: "thin", color: { argb: "FFD9E2DC" } },
        };
      });

      row.getCell(2).numFmt = "dd.mm.yyyy hh:mm AM/PM";
      row.getCell(3).numFmt = "@";
      row.getCell(7).numFmt = "@";
      row.getCell(8).numFmt = "#,##0";
    }
  }
  sheet.views = [{ state: "frozen", ySplit: 1, zoomScale: 80 }];
  sheet.properties.defaultRowHeight = 22;
  sheet.autoFilter = { from: "A1", to: `H${Math.max(sheet.rowCount, 1)}` };
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="green-genx-registrations.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
