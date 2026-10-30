import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { createDocPreviewUrl } from "@/lib/uploads";
import { isSameOrigin, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  registrationId: z.string().uuid(),
  kind: z.enum(["id_card", "payment"]),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Request blocked.", 403);
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = requestSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Invalid document request.", 400);

  const { data, error } = await auth.admin.supabase
    .from("registrations")
    .select("leader_id_card_path, payment_screenshot_path")
    .eq("id", parsed.data.registrationId)
    .maybeSingle();
  if (error) {
    console.error("document lookup failed:", error.message);
    return jsonError("Could not load this document.", 503);
  }
  if (!data) return jsonError("Registration not found.", 404);

  const path = parsed.data.kind === "id_card" ? data.leader_id_card_path : data.payment_screenshot_path;
  if (typeof path !== "string") return jsonError("No document was uploaded for this registration.", 404);
  const url = await createDocPreviewUrl(path);
  if (!url) return jsonError("The secure preview could not be created. Please try again.", 503);
  return NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
}
