import type { Metadata } from "next";
import Link from "next/link";
import StatusLookup from "@/components/StatusLookup";

export const metadata: Metadata = {
  title: "Check registration status",
  description: "Securely check your Green GenX team registration.",
};

export default async function StatusPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code = "" } = await searchParams;
  return (
    <main className="min-h-screen bg-brand-50/60">
      <header className="border-b border-brand-100 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" className="brand-lockup"><span className="brand-mark" aria-hidden="true">G</span><span className="font-display font-bold text-brand-900">GREEN GENX</span></Link>
          <Link href="/" className="text-sm font-semibold text-ink-soft hover:text-brand-800">Back to event</Link>
        </div>
      </header>
      <div className="container-page grid min-h-[calc(100vh-4rem)] items-start gap-8 py-12 md:grid-cols-[0.8fr_1.2fr] md:py-20">
        <div className="pt-3">
          <p className="eyebrow eyebrow-dark">Your application</p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-brand-950">Check your team’s status.</h1>
          <p className="mt-4 max-w-md leading-7 text-ink-soft">Enter the registration ID and private token you received after submitting your application. Both are needed to protect your team’s information.</p>
          <p className="mt-5 text-sm text-ink-mute">Lost your token? Contact the event organizers using your team leader’s registered email.</p>
        </div>
        <StatusLookup initialCode={code} />
      </div>
    </main>
  );
}
