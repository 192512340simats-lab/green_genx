"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ParticipantCategory, RegistrationStatus } from "@/lib/types";

export default function RegistrationActions({
  id,
  category,
  status,
  paymentStatus,
}: {
  id: string;
  category: ParticipantCategory;
  status: RegistrationStatus;
  paymentStatus: "not_required" | "pending" | "verified";
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function update(action: "approve" | "reject" | "verify_payment") {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: reason }),
      });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not update this registration.");
        return;
      }
      setMessage(data.message ?? "Registration updated.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="font-display text-lg font-semibold text-brand-950">Organizer decision</h2>
      <p className="mt-1 text-sm text-ink-soft">Current status: <span className="font-semibold capitalize">{status}</span></p>
      {category === "external" && paymentStatus !== "verified" && (
        <button type="button" className="btn-secondary mt-5 w-full" disabled={busy || paymentStatus !== "pending"} onClick={() => update("verify_payment")}>
          {busy ? "Updating..." : "Mark payment as verified"}
        </button>
      )}
      {category === "external" && paymentStatus === "verified" && <p className="mt-5 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">Payment verified. This team can now be approved.</p>}
      <div className="mt-5 space-y-3">
        <button type="button" className="btn-primary w-full" disabled={busy || status === "approved" || (category === "external" && paymentStatus !== "verified")} onClick={() => update("approve")}>
          {busy ? "Updating..." : "Approve team"}
        </button>
        <label className="block"><span className="label">Reason if rejecting</span><textarea className="input min-h-24 resize-y" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain what needs attention..." /></label>
        <button type="button" className="btn-danger w-full" disabled={busy || status === "rejected" || reason.trim().length < 3} onClick={() => update("reject")}>
          Reject registration
        </button>
      </div>
      {message && <p role="status" className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">{message}</p>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
