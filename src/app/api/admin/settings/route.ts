import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { isSameOrigin, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  event_name: z.string().trim().min(2).max(100),
  tagline: z.string().trim().min(2).max(200),
  about: z.string().trim().max(2000),
  event_date: z.string().datetime(),
  venue: z.string().trim().min(2).max(200),
  duration_text: z.string().trim().min(1).max(50),
  registration_open: z.boolean(),
  registration_deadline: z.string().datetime().nullable(),
  external_fee_per_member: z.coerce.number().int().min(0).max(100000),
  payment_upi_id: z.string().trim().max(100),
  payment_instructions: z.string().trim().max(1000),
  contact_name: z.string().trim().max(100),
  contact_phone: z.string().trim().max(30),
  contact_email: z.union([z.literal(""), z.string().trim().email().max(254)]),
  instagram_url: z.union([z.literal(""), z.string().trim().url().max(300)]),
});

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Request blocked.", 403);
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = settingsSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Please check the event settings and try again.", 400);
  const { error } = await auth.admin.supabase
    .from("event_settings")
    .update(parsed.data)
    .eq("id", 1);
  if (error) {
    console.error("event settings update failed:", error.message);
    return jsonError("Could not save event settings. Please try again.", 500);
  }
  return NextResponse.json({ ok: true, message: "Event settings saved." }, { headers: { "Cache-Control": "no-store" } });
}
