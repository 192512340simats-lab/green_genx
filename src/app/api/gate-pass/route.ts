import { Document, renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { createElement } from "react";
import { NextResponse } from "next/server";
import GatePassDocument from "@/lib/gate-pass";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { LIMITS, rateLimitByIp } from "@/lib/rate-limit";
import { registrationCodeSchema } from "@/lib/validation";
import type { Registration, TeamMember } from "@/lib/types";
import { backendConfigurationError } from "@/lib/server-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configurationError = backendConfigurationError();
  if (configurationError) return NextResponse.json({ error: `Gate-pass setup is incomplete: ${configurationError} See README.md.` }, { status: 503 });
  const limit = await rateLimitByIp("gate-pass", request.headers, LIMITS.gatePassPerIp);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many downloads. Please try again later." }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
    });
  }
  const { searchParams } = new URL(request.url);
  const parsed = registrationCodeSchema.safeParse(searchParams.get("code"));
  if (!parsed.success) return NextResponse.json({ error: "Invalid registration ID." }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { data: registration, error: registrationError } = await supabase
    .from("registrations")
    .select("*")
    .eq("registration_code", parsed.data)
    .eq("status", "approved")
    .maybeSingle();
  if (registrationError) {
    console.error("gate pass registration lookup failed:", registrationError.message);
    return NextResponse.json({ error: "Could not create the gate pass right now." }, { status: 503 });
  }
  if (!registration) return NextResponse.json({ error: "No approved registration was found." }, { status: 404 });

  const [{ data: members, error: membersError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from("team_members").select("*").eq("registration_id", registration.id).order("position"),
    supabase.from("event_settings").select("event_date, venue").eq("id", 1).single(),
  ]);
  if (membersError || settingsError || !settings) {
    console.error("gate pass details lookup failed:", membersError?.message, settingsError?.message);
    return NextResponse.json({ error: "Could not load the gate pass details." }, { status: 503 });
  }

  const verificationUrl = `${publicEnv.siteUrl}/verify/${encodeURIComponent(registration.registration_code)}`;
  let pdf: Buffer;
  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: "M", margin: 1, width: 240 });
    pdf = await renderToBuffer(createElement(
      Document,
      { title: `Green GenX Gate Pass - ${registration.registration_code}`, author: "Green GenX" },
      createElement(GatePassDocument, {
        registration: registration as Registration,
        members: (members ?? []) as TeamMember[],
        eventDate: new Date(settings.event_date).toLocaleDateString("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }),
        venue: settings.venue,
        qrDataUrl,
      })
    ));
  } catch (error) {
    console.error("gate pass PDF generation failed:", error);
    return NextResponse.json({ error: "Could not generate the gate pass. Please try again later." }, { status: 500 });
  }
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${registration.registration_code}-gate-pass.pdf"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
