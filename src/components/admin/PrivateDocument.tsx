"use client";

import Image from "next/image";
import { useState } from "react";

export default function PrivateDocument({ registrationId, kind, label }: { registrationId: string; kind: "id_card" | "payment"; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function showDocument() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, kind }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? "Could not load this document.");
        return;
      }
      setUrl(data.url);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-brand-900">{label}</p>
        <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={showDocument} disabled={loading}>{loading ? "Loading..." : url ? "Refresh preview" : "View secure preview"}</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {url && <div className="mt-4"><Image src={url} alt={label} width={600} height={600} unoptimized className="max-h-96 w-auto rounded-lg border border-brand-100 object-contain" /><p className="mt-2 text-xs text-ink-mute">Private preview link expires after one minute. Images displayed in a browser may still be saved by viewers.</p></div>}
    </div>
  );
}
