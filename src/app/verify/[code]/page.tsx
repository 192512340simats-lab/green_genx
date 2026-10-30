import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { LIMITS, rateLimitByIp } from "@/lib/rate-limit";
import { registrationCodeSchema } from "@/lib/validation";
import { headers } from "next/headers";
import { backendConfigurationError } from "@/lib/server-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Verify event registration", robots: { index: false, follow: false } };
}

export default async function VerifyPage({ params }: Props) {
  const { code: rawCode } = await params;
  const parsed = registrationCodeSchema.safeParse(rawCode);
  if (!parsed.success) notFound();
  const configurationError = backendConfigurationError();
  if (configurationError) {
    return <VerifyCard title="Verification not configured" message={`The organizer has not completed the website setup: ${configurationError} See README.md.`} valid={false} />;
  }

  const requestHeaders = await headers();
  const limit = await rateLimitByIp("verify", requestHeaders, LIMITS.verifyPerIp);
  if (!limit.allowed) {
    return <VerifyCard title="Please try again shortly" message="This verification page has reached its request limit. Wait a few minutes and refresh." valid={false} />;
  }

  const { data, error } = await createSupabaseServiceClient()
    .from("registrations")
    .select("registration_code, team_name, status")
    .eq("registration_code", parsed.data)
    .maybeSingle();

  if (error) {
    console.error("registration verification failed:", error.message);
    return <VerifyCard title="Verification unavailable" message="We couldn’t verify this registration right now. Please try again later." valid={false} />;
  }
  if (!data || data.status !== "approved") {
    return <VerifyCard title="Not approved for entry" message="This registration is not currently approved. Please check with the event organizers." valid={false} />;
  }

  return (
    <VerifyCard
      title="Registration verified"
      message={`${data.team_name} is approved for Green GenX.`}
      code={data.registration_code}
      valid
    />
  );
}

function VerifyCard({ title, message, code, valid }: { title: string; message: string; code?: string; valid: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-brand-50 px-4 py-12">
      <section className="card w-full max-w-lg text-center">
        <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-2xl font-bold ${valid ? "bg-brand-100 text-brand-800" : "bg-amber-100 text-amber-800"}`} aria-hidden="true">{valid ? "✓" : "!"}</span>
        <p className="eyebrow eyebrow-dark mt-5 justify-center">Green GenX · SIMATS Engineering</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-brand-950">{title}</h1>
        <p className="mt-3 leading-7 text-ink-soft">{message}</p>
        {code && <p className="mt-5 rounded-xl bg-brand-50 px-4 py-3 font-mono text-sm font-bold text-brand-900">{code}</p>}
        <Link href="/" className="text-link mt-7 justify-center">Visit Green GenX <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
