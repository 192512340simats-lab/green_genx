import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { isSameOrigin, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("verify_payment") }),
  z.object({ action: z.literal("reject"), rejectionReason: z.string().trim().min(3).max(500) }),
  z.object({
    action: z.literal("edit"),
    teamName: z.string().trim().min(2).max(80),
    projectTitle: z.string().trim().min(2).max(150),
    collegeName: z.string().trim().min(2).max(150),
    department: z.string().trim().min(2).max(100),
    yearOfStudy: z.coerce.number().int().min(1).max(6),
    leaderRegNo: z.string().trim().min(5).max(20).regex(/^[A-Za-z0-9][A-Za-z0-9/-]*$/).optional(),
  }),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return jsonError("Request blocked.", 403);
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return jsonError("Registration not found.", 404);
  }
  const parsed = requestSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Choose a valid action and provide a rejection reason when rejecting.", 400);

  const { supabase } = auth.admin;
  if (parsed.data.action === "edit") {
    if (parsed.data.leaderRegNo !== undefined) {
      const { data: current, error: lookupError } = await supabase.from("registrations").select("category").eq("id", id).maybeSingle();
      if (lookupError) {
        console.error("registration edit lookup failed:", lookupError.message);
        return jsonError("Could not load this registration.", 503);
      }
      if (!current) return jsonError("Registration not found.", 404);
      if (current.category !== "internal") return jsonError("Leader registration numbers are only used for internal teams.", 400);
    }
    const changes: Record<string, string | number> = {
      team_name: parsed.data.teamName,
      project_title: parsed.data.projectTitle,
      college_name: parsed.data.collegeName,
      department: parsed.data.department,
      year_of_study: parsed.data.yearOfStudy,
    };
    if (parsed.data.leaderRegNo !== undefined) changes.leader_reg_no = parsed.data.leaderRegNo.toUpperCase();
    const { data, error } = await supabase.from("registrations").update(changes).eq("id", id).select("id").maybeSingle();
    if (error) {
      console.error("registration edit failed:", error.message);
      if (error.code === "23505") return jsonError("That team name or registration number is already in use.", 409);
      return jsonError("Could not save registration edits. Please try again.", 500);
    }
    if (!data) return jsonError("Registration not found.", 404);
    return NextResponse.json({ ok: true, message: "Registration details saved." }, { headers: { "Cache-Control": "no-store" } });
  }

  if (parsed.data.action === "verify_payment") {
    const { data: registration, error: lookupError } = await supabase
      .from("registrations")
      .select("category, payment_status")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) {
      console.error("payment verification lookup failed:", lookupError.message);
      return jsonError("Could not load this registration.", 503);
    }
    if (!registration || registration.category !== "external" || registration.payment_status !== "pending") {
      return jsonError("This registration is not awaiting payment verification.", 409);
    }
    const { error } = await supabase.from("registrations").update({ payment_status: "verified" }).eq("id", id);
    if (error) {
      console.error("payment verification update failed:", error.message);
      return jsonError("Could not verify payment. Please try again.", 500);
    }
    return NextResponse.json({ ok: true, message: "Payment marked as verified." }, { headers: { "Cache-Control": "no-store" } });
  }

  const changes = parsed.data.action === "approve"
    ? { status: "approved", rejection_reason: null }
    : { status: "rejected", rejection_reason: parsed.data.rejectionReason };
  const { data, error } = await supabase
    .from("registrations")
    .update(changes)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("registration decision update failed:", error.message);
    if (error.code === "23514") return jsonError("This team cannot be approved until its payment is verified.", 409);
    return jsonError("Could not update the registration. Please try again.", 500);
  }
  if (!data) return jsonError("Registration not found.", 404);

  return NextResponse.json(
    { ok: true, message: parsed.data.action === "approve" ? "Team approved." : "Registration rejected." },
    { headers: { "Cache-Control": "no-store" } }
  );
}
