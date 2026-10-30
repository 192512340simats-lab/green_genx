import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicSupabaseConfigurationError } from "@/lib/server-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const configurationError = publicSupabaseConfigurationError();
  if (configurationError) {
    return NextResponse.json({ error: `Registration setup is incomplete: ${configurationError} See README.md.` }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("event_settings")
    .select("registration_open, registration_deadline, external_fee_per_member, payment_upi_id, payment_instructions, payment_qr_path")
    .eq("id", 1)
    .single();

  if (error || !data) {
    console.error("public event settings lookup failed:", error?.message);
    return NextResponse.json({ error: "Could not load registration details. Please refresh or contact the organizers." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const qrUrl = data.payment_qr_path
    ? supabase.storage.from("site-assets").getPublicUrl(data.payment_qr_path).data.publicUrl
    : null;
  return NextResponse.json(
    {
      ...data,
      payment_qr_url: qrUrl,
      registration_open: data.registration_open && (!data.registration_deadline || new Date(data.registration_deadline).getTime() >= Date.now()),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
