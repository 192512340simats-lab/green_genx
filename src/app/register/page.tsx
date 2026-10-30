import type { Metadata } from "next";
import Link from "next/link";
import RegistrationForm from "@/components/RegistrationForm";

export const metadata: Metadata = {
  title: "Register your team",
  description: "Register a 3–4 member team for Green GenX 2026.",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-brand-50/60">
      <header className="border-b border-brand-100 bg-white">
        <div className="container-page flex min-h-20 items-center justify-between py-3">
          <Link href="/" className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">G</span>
            <span className="font-display text-3xl font-extrabold tracking-tight text-brand-900 sm:text-5xl">GREEN GEN_X</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-ink-soft hover:text-brand-800">Back to event</Link>
        </div>
      </header>
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[0.7fr_1.3fr] lg:py-16">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow eyebrow-dark">19 November 2026 · SIMATS Engineering</p>
          <p className="eyebrow eyebrow-dark mt-2">DEPARTMENT OF ENVIRONMENTAL BIOTECHNOLOGY</p>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-brand-950">Bring your team’s idea to life.</h1>
          <p className="mt-4 leading-7 text-ink-soft">Tell us about your team and project. A team must have 3–4 members, and the first person listed is the team leader.</p>
          <div className="mt-7 space-y-3 rounded-2xl border border-brand-100 bg-white p-5 text-sm text-ink-soft shadow-card">
            <p className="font-semibold text-brand-900">Before you start</p>
            <ul className="list-inside list-disc space-y-2">
              <li>Have your team members’ names, emails, and mobile numbers ready.</li>
              <li>Internal teams need the leader’s college registration number and ID card image.</li>
              <li>External teams need payment details and a payment screenshot.</li>
            </ul>
            <p className="border-t border-brand-100 pt-3 text-xs leading-5 text-ink-mute">Your registration ID and private status token will be shown once after a successful submission. Save both somewhere safe.</p>
          </div>
        </aside>
        <RegistrationForm />
      </div>
    </main>
  );
}
