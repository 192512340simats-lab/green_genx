"use client";

import { useState, type FormEvent } from "react";

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        const data = (await res.json()) as { message?: string };
        setMessage(data.message ?? "Check your inbox for a sign-in link.");
        return;
      }

      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Sign-in failed. Please try again.");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="label">
          Organizer email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="organizer@example.com"
        />
      </div>

      {(error ?? (message ? undefined : initialError)) && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error ?? initialError}
        </p>
      )}
      {message && <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{message}</p>}

      <button type="submit" disabled={loading || !email.trim()} className="btn-primary w-full">
        {loading ? "Sending link..." : message ? "Send another sign-in link" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
