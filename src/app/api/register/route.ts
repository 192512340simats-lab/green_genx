import { NextResponse } from "next/server";
import {
  flattenZodErrors,
  registrationSchema,
} from "@/lib/validation";
import { deletePrivateDocs, UploadError, uploadPrivateDoc, validateImageUpload } from "@/lib/uploads";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { generateStatusToken, hashStatusToken } from "@/lib/tokens";
import { isSameOrigin, jsonError } from "@/lib/http";
import { LIMITS, rateLimitByIp } from "@/lib/rate-limit";
import { backendConfigurationError } from "@/lib/server-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Request blocked.", 403);
  const configurationError = backendConfigurationError();
  if (configurationError) return jsonError(`Registration setup is incomplete: ${configurationError} See README.md.`, 503);

  const limit = await rateLimitByIp("register", request.headers, LIMITS.registerPerIp);
  if (!limit.allowed) {
    return jsonError(
      `Too many registration attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
      429,
      undefined,
      { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("The submitted form could not be read. Please try again.", 400);
  }

  const rawRegistration = formData.get("registration");
  if (typeof rawRegistration !== "string") {
    return jsonError("Registration information is missing.", 400);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawRegistration);
  } catch {
    return jsonError("Registration information is invalid.", 400);
  }

  const parsed = registrationSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Please check the registration details.", 400, {
      fieldErrors: flattenZodErrors(parsed.error),
    });
  }

  const input = parsed.data;
  let idCardPath: string | null = null;
  let paymentPath: string | null = null;
  let registrationId: string | null = null;

  try {
    const supabase = createSupabaseServiceClient();
    const { data: settings, error: settingsError } = await supabase
      .from("event_settings")
      .select("event_date, registration_open, registration_deadline, external_fee_per_member")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) {
      console.error("registration settings lookup failed:", settingsError?.message);
      return jsonError("Registration is temporarily unavailable. Please contact the organizers.", 503);
    }

    const deadlinePassed = settings.registration_deadline
      ? new Date(settings.registration_deadline).getTime() < Date.now()
      : false;
    if (!settings.registration_open || deadlinePassed) {
      return jsonError("Team registration is currently closed.", 403);
    }

    const idCard = input.category === "internal"
      ? await validateImageUpload(formData.get("leaderIdCard"), "Leader’s college ID card")
      : null;
    const paymentScreenshot = input.category === "external"
      ? await validateImageUpload(formData.get("paymentScreenshot"), "Payment screenshot")
      : null;

    if (idCard) idCardPath = await uploadPrivateDoc("id-cards", idCard);
    if (paymentScreenshot) paymentPath = await uploadPrivateDoc("payments", paymentScreenshot);

    const token = generateStatusToken();
    const year = new Date(settings.event_date).getFullYear();
    const { data: registrationCode, error: codeError } = await supabase.rpc("next_registration_code", {
      p_category: input.category,
      p_year: year,
    });
    if (codeError || typeof registrationCode !== "string") {
      console.error("registration code generation failed:", codeError?.message);
      await deletePrivateDocs([idCardPath, paymentPath]);
      return jsonError("Registration could not be created right now. Please try again shortly.", 503);
    }

    const members = input.members;
    const feePerMember = input.category === "external" ? settings.external_fee_per_member : 0;
    const { data: registration, error: insertError } = await supabase
      .from("registrations")
      .insert({
        registration_code: registrationCode,
        category: input.category,
        team_name: input.teamName,
        leader_name: members[0].fullName,
        college_name: input.collegeName,
        department: input.department,
        year_of_study: input.yearOfStudy,
        project_title: input.projectTitle,
        leader_reg_no: input.category === "internal" ? input.leaderRegNo : null,
        leader_id_card_path: idCardPath,
        member_count: members.length,
        fee_per_member: feePerMember,
        total_fee: feePerMember * members.length,
        transaction_id: input.category === "external" ? input.transactionId : null,
        payment_date: input.category === "external" ? input.paymentDate : null,
        payment_time: input.category === "external" ? input.paymentTime : null,
        payment_screenshot_path: paymentPath,
        payment_status: input.category === "external" ? "pending" : "not_required",
        status: "pending",
        status_token_hash: hashStatusToken(token),
      })
      .select("id")
      .single();

    if (insertError || !registration) {
      console.error("registration insert failed:", insertError?.message);
      await deletePrivateDocs([idCardPath, paymentPath]);
      if (insertError?.code === "23505") {
        return jsonError("A team name, registration number, or transaction ID is already registered. Please check your details.", 409);
      }
      return jsonError("We couldn’t save your registration. Please try again.", 500);
    }
    registrationId = registration.id;

    const { error: membersError } = await supabase.from("team_members").insert(
      members.map((member, index) => ({
        registration_id: registrationId,
        position: index + 1,
        full_name: member.fullName,
        email: member.email,
        phone: member.phone,
        is_leader: index === 0,
      }))
    );
    if (membersError) {
      console.error("team member insert failed:", membersError.message);
      const { error: rollbackError } = await supabase.from("registrations").delete().eq("id", registrationId);
      if (rollbackError) console.error("registration rollback failed:", rollbackError.message);
      await deletePrivateDocs([idCardPath, paymentPath]);
      return jsonError("We couldn’t save the complete team registration. Please try again.", 500);
    }

    return NextResponse.json(
      { registrationCode, token },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("registration request failed:", error);
    if (registrationId) {
      const { error: rollbackError } = await createSupabaseServiceClient()
        .from("registrations")
        .delete()
        .eq("id", registrationId);
      if (rollbackError) console.error("registration rollback failed:", rollbackError.message);
    }
    await deletePrivateDocs([idCardPath, paymentPath]);
    if (error instanceof UploadError) return jsonError(error.message, 400);
    return jsonError("Registration could not be completed. Please try again later.", 500);
  }
}
