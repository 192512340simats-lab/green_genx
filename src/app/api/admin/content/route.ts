import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { isSameOrigin, jsonError, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  objectives: z.array(z.object({ body: z.string().trim().min(2).max(500) })).min(1).max(20),
  themes: z.array(z.object({ title: z.string().trim().min(2).max(100), description: z.string().trim().max(500) })).min(1).max(20),
  schedule: z.array(z.object({ time_label: z.string().trim().min(2).max(50), title: z.string().trim().min(2).max(120), description: z.string().trim().max(500) })).min(1).max(30),
  rules: z.array(z.object({ body: z.string().trim().min(2).max(500) })).min(1).max(30),
});

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Request blocked.", 403);
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Check each content line and try again. All lists need at least one valid item.", 400);
  const { objectives, themes, schedule, rules } = parsed.data;
  const { error } = await auth.admin.supabase.rpc("replace_event_content", {
    p_objectives: objectives,
    p_themes: themes,
    p_schedule: schedule,
    p_rules: rules,
  });
  if (error) {
    console.error("public event content update failed:", error.message);
    return jsonError("Could not save event content. Confirm migration 0003_admin_content.sql has been applied.", 503);
  }
  return NextResponse.json({ ok: true, message: "Public website content saved." }, { headers: { "Cache-Control": "no-store" } });
}
