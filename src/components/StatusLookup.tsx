"use client";

import { useState, type FormEvent } from "react";

type StatusResult = {
  registrationCode: string;
  category: "internal" | "external";
  teamName: string;
  projectTitle: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  paymentStatus: "not_required" | "pending" | "verified";
  totalFee: number;
  updatedAt: string;
};

export default function StatusLookup({ initialCode }: { initialCode: string }) {
  const [registrationCode, setRegistrationCode] = useState(initialCode);
  const [token, setToken] = useState("");
  const [result, setResult] = useState<StatusResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const response = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationCode, token }),
      });
      const data = await response.json() as StatusResult & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not check your status. Please try again.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="card space-y-5 p-6 sm:p-8">
        <div>
          <label htmlFor="registration-code" className="label">Registration ID</label>
          <input id="registration-code" className="input font-mono uppercase" value={registrationCode} onChange={(event) => setRegistrationCode(event.target.value)} placeholder="GGX-INT-2026-001" autoComplete="off" required />
        </div>
        <div>
          <label htmlFor="status-token" className="label">Private status token</label>
          <input id="status-token" className="input font-mono" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste your 32-character token" autoComplete="off" required />
          <p className="mt-2 text-xs text-ink-mute">The token is case-sensitive. It was shown once after registration.</p>
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading || !registrationCode || !token}>{loading ? "Checking securely..." : "Check status"}</button>
      </form>

      {result && (
        <section className="card border-brand-200" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-wider text-ink-mute">Team</p><h2 className="mt-1 font-display text-xl font-semibold text-brand-950">{result.teamName}</h2></div>
            <span className={`status-pill status-${result.status}`}>{result.status}</span>
          </div>
          <dl className="mt-5 grid gap-4 border-t border-brand-100 pt-5 sm:grid-cols-2">
            <div><dt className="text-xs text-ink-mute">Registration ID</dt><dd className="mt-1 font-mono text-sm font-semibold text-brand-900">{result.registrationCode}</dd></div>
            <div><dt className="text-xs text-ink-mute">Team type</dt><dd className="mt-1 text-sm font-semibold capitalize text-brand-900">{result.category}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-ink-mute">Project idea</dt><dd className="mt-1 text-sm font-medium text-brand-900">{result.projectTitle}</dd></div>
            {result.category === "external" && <div><dt className="text-xs text-ink-mute">Payment</dt><dd className="mt-1 text-sm font-semibold capitalize text-brand-900">{result.paymentStatus.replace("_", " ")} · ₹{result.totalFee}</dd></div>}
            <div><dt className="text-xs text-ink-mute">Last updated</dt><dd className="mt-1 text-sm text-brand-900">{new Date(result.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</dd></div>
          </dl>
          {result.status === "pending" && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Your application is being reviewed. Please check again later.</p>}
          {result.status === "approved" && <p className="mt-5 rounded-xl bg-brand-50 p-4 text-sm leading-6 text-brand-900">Your team is approved. Keep your registration ID available for event check-in.</p>}
          {result.status === "rejected" && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-900"><strong>Organizer note:</strong> {result.rejectionReason}</p>}
        </section>
      )}
    </div>
  );
}
