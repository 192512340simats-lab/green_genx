"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import type { EventSettings } from "@/lib/types";

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const valueFor = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}T${valueFor("hour")}:${valueFor("minute")}`;
}

export default function SettingsForm({ settings, initialQrUrl }: { settings: EventSettings; initialQrUrl: string | null }) {
  const [values, setValues] = useState({
    event_name: settings.event_name,
    tagline: settings.tagline,
    about: settings.about,
    event_date: toLocalDateTime(settings.event_date),
    venue: settings.venue,
    duration_text: settings.duration_text,
    registration_open: settings.registration_open,
    registration_deadline: toLocalDateTime(settings.registration_deadline),
    external_fee_per_member: String(settings.external_fee_per_member),
    payment_upi_id: settings.payment_upi_id,
    payment_instructions: settings.payment_instructions,
    contact_name: settings.contact_name,
    contact_phone: settings.contact_phone,
    contact_email: settings.contact_email,
    instagram_url: settings.instagram_url,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(initialQrUrl);
  const [uploadingQr, setUploadingQr] = useState(false);

  function update(name: keyof typeof values, value: string | boolean) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          event_date: new Date(`${values.event_date}:00+05:30`).toISOString(),
          registration_deadline: values.registration_deadline
            ? new Date(`${values.registration_deadline}:00+05:30`).toISOString()
            : null,
        }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not save event settings.");
        return;
      }

      setMessage(result.message ?? "Settings saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadQr() {
    if (!qrFile) return;
    setUploadingQr(true);
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("qr", qrFile);
    try {
      const response = await fetch("/api/admin/settings/qr", { method: "POST", body: formData });
      const result = await response.json() as { error?: string; url?: string };
      if (!response.ok || !result.url) {
        setError(result.error ?? "Could not upload the payment QR.");
        return;
      }
      setQrUrl(result.url);
      setQrFile(null);
      setMessage("Payment QR updated.");
    } catch {
      setError("Network error while uploading the payment QR.");
    } finally {
      setUploadingQr(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="card space-y-4">
        <div><h2 className="font-display text-lg font-semibold text-brand-950">Event information</h2><p className="mt-1 text-sm text-ink-soft">Details used by the event registration service.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Event name" value={values.event_name} onChange={(v) => update("event_name", v)} />
          <TextInput label="Tagline" value={values.tagline} onChange={(v) => update("tagline", v)} />
          <TextInput label="Venue" value={values.venue} onChange={(v) => update("venue", v)} />
          <TextInput label="Duration" value={values.duration_text} onChange={(v) => update("duration_text", v)} />
          <label><span className="label">Event date and time (IST)</span><input className="input" type="datetime-local" value={values.event_date} onChange={(e) => update("event_date", e.target.value)} required /></label>
          <label><span className="label">About the event</span><textarea className="input min-h-28 resize-y" value={values.about} onChange={(e) => update("about", e.target.value)} maxLength={2000} /></label>
        </div>
      </section>

      <section className="card space-y-4">
        <div><h2 className="font-display text-lg font-semibold text-brand-950">Registration</h2><p className="mt-1 text-sm text-ink-soft">Changes apply immediately to new registrations.</p></div>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-brand-100 p-4"><span><span className="block font-semibold text-brand-900">Accept registrations</span><span className="mt-1 block text-xs text-ink-mute">You can close registration without losing submitted applications.</span></span><input className="h-5 w-5 accent-brand-700" type="checkbox" checked={values.registration_open} onChange={(e) => update("registration_open", e.target.checked)} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Registration deadline (optional)</span><input className="input" type="datetime-local" value={values.registration_deadline} onChange={(e) => update("registration_deadline", e.target.value)} /></label>
          <label><span className="label">External fee per member (₹)</span><input className="input" type="number" min="0" max="100000" step="1" value={values.external_fee_per_member} onChange={(e) => update("external_fee_per_member", e.target.value)} required /></label>
        </div>
      </section>

      <section className="card space-y-4">
        <div><h2 className="font-display text-lg font-semibold text-brand-950">Payment and contact</h2><p className="mt-1 text-sm text-ink-soft">These details are available to participants.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="UPI ID" value={values.payment_upi_id} onChange={(v) => update("payment_upi_id", v)} />
          <TextInput label="Organizer name" value={values.contact_name} onChange={(v) => update("contact_name", v)} />
          <TextInput label="Contact phone" value={values.contact_phone} onChange={(v) => update("contact_phone", v)} />
          <TextInput label="Contact email" value={values.contact_email} onChange={(v) => update("contact_email", v)} type="email" />
          <TextInput label="Instagram URL" value={values.instagram_url} onChange={(v) => update("instagram_url", v)} type="url" />
          <label><span className="label">Payment instructions</span><textarea className="input min-h-28 resize-y" value={values.payment_instructions} onChange={(e) => update("payment_instructions", e.target.value)} maxLength={1000} /></label>
        </div>
        <div className="border-t border-brand-100 pt-4">
          <label className="block"><span className="label">Payment QR image</span><input className="block w-full rounded-xl border border-brand-200 bg-white px-3 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-800" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setQrFile(event.target.files?.[0] ?? null)} /><span className="mt-1 block text-xs text-ink-mute">JPG, PNG, or WebP; maximum 2 MB. Uploading replaces the current QR.</span></label>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {qrUrl && <Image src={qrUrl} alt="Current event payment QR" width={128} height={128} className="h-32 w-32 rounded-lg border border-brand-100 bg-white object-contain p-2" />}
            {qrFile && <button type="button" className="btn-secondary px-4 py-2" onClick={uploadQr} disabled={uploadingQr}>{uploadingQr ? "Uploading..." : "Upload selected QR"}</button>}
          </div>
        </div>
      </section>

      {message && <p role="status" className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800">{message}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>{saving ? "Saving..." : "Save event settings"}</button>
    </form>
  );
}

function TextInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label><span className="label">{label}</span><input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} maxLength={type === "url" ? 300 : 200} /></label>;
}
