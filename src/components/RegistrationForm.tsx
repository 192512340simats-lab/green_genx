"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  flattenZodErrors,
  registrationSchema,
  type TeamMemberInput,
} from "@/lib/validation";
import type { ParticipantCategory } from "@/lib/types";

type FormMember = { fullName: string; email: string; phone: string };
const emptyMember: FormMember = { fullName: "", email: "", phone: "" };
type EventRegistrationSettings = {
  registration_open: boolean;
  external_fee_per_member: number;
  payment_upi_id: string;
  payment_instructions: string;
  payment_qr_url: string | null;
};

export default function RegistrationForm() {
  const [category, setCategory] = useState<ParticipantCategory>("internal");
  const [members, setMembers] = useState<FormMember[]>([{ ...emptyMember }, { ...emptyMember }, { ...emptyMember }]);
  const [form, setForm] = useState({
    teamName: "",
    collegeName: "",
    department: "",
    yearOfStudy: "",
    projectTitle: "",
    leaderRegNo: "",
    transactionId: "",
    paymentDate: "",
    paymentTime: "",
  });
  const [idCard, setIdCard] = useState<File | null>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ registrationCode: string; token: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventSettings, setEventSettings] = useState<EventRegistrationSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const paymentQrDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    let hasLoaded = false;
    let requestPending = false;

    async function loadEventSettings() {
      if (requestPending) return;
      requestPending = true;
      try {
        const response = await fetch("/api/event-settings", { cache: "no-store" });
        const data = await response.json() as EventRegistrationSettings & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load registration details.");
        if (active) {
          setEventSettings(data);
          setSettingsError(null);
          hasLoaded = true;
        }
      } catch (cause: unknown) {
        if (active && !hasLoaded) {
          setSettingsError(cause instanceof Error ? cause.message : "Could not load registration details.");
        }
      } finally {
        requestPending = false;
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void loadEventSettings();
    }

    void loadEventSettings();
    const interval = window.setInterval(() => void loadEventSettings(), 60_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  function updateForm(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateMember(index: number, field: keyof FormMember, value: string) {
    setMembers((current) => current.map((member, i) => i === index ? { ...member, [field]: value } : member));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setSubmitError(null);
    setErrors({});
    const parsed = registrationSchema.safeParse({
      category,
      ...form,
      yearOfStudy: form.yearOfStudy,
      members: members as TeamMemberInput[],
    });
    if (!parsed.success) {
      setErrors(flattenZodErrors(parsed.error));
      setSubmitError("Please check the highlighted fields and try again.");
      return;
    }

    if (category === "internal" && !idCard) {
      setErrors({ leaderIdCard: "Upload the team leader’s college ID card image." });
      setSubmitError("Please add the required ID card image.");
      return;
    }
    if (category === "external" && !paymentScreenshot) {
      setErrors({ paymentScreenshot: "Upload the payment screenshot." });
      setSubmitError("Please add the required payment screenshot.");
      return;
    }

    const payload = parsed.data;
    const formData = new FormData();
    formData.set("registration", JSON.stringify(payload));
    if (idCard) formData.set("leaderIdCard", idCard);
    if (paymentScreenshot) formData.set("paymentScreenshot", paymentScreenshot);

    setLoading(true);
    try {
      const response = await fetch("/api/register", { method: "POST", body: formData });
      const data = await response.json() as { error?: string; registrationCode?: string; token?: string; fieldErrors?: Record<string, string> };
      if (!response.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setSubmitError(data.error ?? "We couldn’t submit your registration. Please try again.");
        return;
      }
      if (!data.registrationCode || !data.token) {
        setSubmitError("The server returned an incomplete registration result. Contact the organizers before submitting again.");
        return;
      }
      setResult({ registrationCode: data.registrationCode, token: data.token });
    } catch {
      setSubmitError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <section className="card self-start border-brand-200 p-6 sm:p-8" aria-labelledby="registration-success">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-xl font-bold text-brand-800" aria-hidden="true">✓</div>
        <p className="eyebrow eyebrow-dark mt-5">You’re on your way</p>
        <h2 id="registration-success" className="mt-2 font-display text-3xl font-semibold tracking-tight text-brand-950">Registration received.</h2>
        <p className="mt-3 leading-7 text-ink-soft">Keep these details safe. Your private status token is shown only once and is needed to check your application.</p>
        <div className="mt-6 space-y-4 rounded-xl bg-brand-50 p-5">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-ink-mute">Registration ID</p><p className="mt-1 break-all font-mono text-lg font-bold text-brand-900">{result.registrationCode}</p></div>
          <div><p className="text-xs font-semibold uppercase tracking-wider text-ink-mute">Private status token</p><p className="mt-1 break-all font-mono text-sm font-semibold text-brand-900">{result.token}</p></div>
        </div>
        <p className="mt-4 text-sm font-medium text-amber-800">Copy or screenshot these details now. The token cannot be recovered.</p>
        <Link href={`/status?code=${encodeURIComponent(result.registrationCode)}`} className="btn-primary mt-6 w-full">Check registration status</Link>
        <button type="button" className="btn-secondary mt-3 w-full" onClick={() => window.print()}>Print / save this page</button>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-7 p-5 sm:p-8" noValidate>
      <div>
        <h2 className="font-display text-xl font-semibold text-brand-950">Team registration</h2>
        <p className="mt-1 text-sm text-ink-mute">Fields marked with * are required.</p>
      </div>

      {settingsError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{settingsError}</p>}
      {eventSettings && !eventSettings.registration_open && <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Registration is currently closed.</p>}

      <fieldset>
        <legend className="label">Team category *</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["internal", "external"] as const).map((value) => (
            <label key={value} className={`cursor-pointer rounded-xl border p-4 transition ${category === value ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-brand-100 hover:border-brand-300"}`}>
              <input className="sr-only" type="radio" name="category" value={value} checked={category === value} onChange={() => setCategory(value)} />
              <span className="font-semibold capitalize text-brand-950">{value} team</span>
              <span className="mt-1 block text-xs leading-5 text-ink-soft">{value === "internal" ? "Students from SIMATS institutions. No registration fee." : `Students from other institutions. ₹${eventSettings?.external_fee_per_member ?? "—"} per member.`}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Team name *" name="teamName" value={form.teamName} onChange={updateForm} error={errors.teamName} />
        <Field label="College / institution *" name="collegeName" value={form.collegeName} onChange={updateForm} error={errors.collegeName} />
        <Field label="Department *" name="department" value={form.department} onChange={updateForm} error={errors.department} />
        <label><span className="label">Year of study *</span>
          <select className="input" name="yearOfStudy" value={form.yearOfStudy} onChange={updateForm}>
            <option value="">Select year</option>{[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>{year}{year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} year</option>)}
          </select>{errors.yearOfStudy && <p className="field-error">{errors.yearOfStudy}</p>}
        </label>
        <div className="sm:col-span-2"><Field label="Project idea / working title *" name="projectTitle" value={form.projectTitle} onChange={updateForm} error={errors.projectTitle} /></div>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div><h3 className="font-display font-semibold text-brand-950">Team members</h3><p className="mt-1 text-xs text-ink-mute">The team leader must be listed first.</p></div>
          {members.length < 4 && <button type="button" className="text-sm font-semibold text-brand-700 hover:text-brand-900" onClick={() => setMembers((current) => [...current, { ...emptyMember }])}>+ Add member</button>}
        </div>
        {members.map((member, index) => (
          <div key={index} className="rounded-xl border border-brand-100 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-700">{index === 0 ? "Team leader" : `Member ${index + 1}`}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label><span className="sr-only">Member {index + 1} full name</span><input className="input" autoComplete="name" placeholder="Full name *" value={member.fullName} onChange={(e) => updateMember(index, "fullName", e.target.value)} />{errors[`members.${index}.fullName`] && <p className="field-error">{errors[`members.${index}.fullName`]}</p>}</label>
              <label><span className="sr-only">Member {index + 1} email</span><input className="input" type="email" autoComplete="email" placeholder="Email address *" value={member.email} onChange={(e) => updateMember(index, "email", e.target.value)} />{errors[`members.${index}.email`] && <p className="field-error">{errors[`members.${index}.email`]}</p>}</label>
              <label><span className="sr-only">Member {index + 1} mobile number</span><input className="input" type="tel" autoComplete="tel" placeholder="Mobile number *" value={member.phone} onChange={(e) => updateMember(index, "phone", e.target.value)} />{errors[`members.${index}.phone`] && <p className="field-error">{errors[`members.${index}.phone`]}</p>}</label>
            </div>
            {index > 2 && <button type="button" className="mt-3 text-xs font-semibold text-red-600" onClick={() => setMembers((current) => current.filter((_, i) => i !== index))}>Remove member</button>}
          </div>
        ))}
        {errors.members && <p className="field-error">{errors.members}</p>}
      </section>

      {category === "internal" ? (
        <section className="space-y-4 border-t border-brand-100 pt-6">
          <h3 className="font-display font-semibold text-brand-950">Internal team details</h3>
          <Field label="Leader’s college registration number *" name="leaderRegNo" value={form.leaderRegNo} onChange={updateForm} error={errors.leaderRegNo} />
          <FileField label="Leader’s college ID card image *" name="leaderIdCard" file={idCard} onChange={setIdCard} error={errors.leaderIdCard} />
        </section>
      ) : (
        <section className="space-y-4 border-t border-brand-100 pt-6">
          {eventSettings?.payment_qr_url ? (
            <div className="flex w-fit items-center gap-4 rounded-xl border border-brand-100 bg-brand-50 p-3">
              <button
                type="button"
                aria-label="View payment QR code full screen"
                aria-haspopup="dialog"
                onClick={() => paymentQrDialog.current?.showModal()}
                className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
              >
                <Image
                  src={eventSettings.payment_qr_url}
                  alt="Payment QR code"
                  width={768}
                  height={916}
                  className="h-36 w-36 rounded-lg bg-white object-contain p-1 sm:h-40 sm:w-40"
                />
              </button>
              <div className="pr-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">Scan to pay</p>
                {eventSettings.payment_upi_id && (
                  <>
                    <p className="mt-2 text-xs font-bold text-brand-900">UPI ID</p>
                    <p className="max-w-40 break-all text-sm font-semibold text-brand-900">{eventSettings.payment_upi_id}</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              {eventSettings ? "The payment QR code is not available yet. Please contact the organizers." : "Loading payment QR code…"}
            </p>
          )}
          {eventSettings?.payment_qr_url && (
            <dialog
              ref={paymentQrDialog}
              aria-label="Payment QR code"
              onClick={(event) => {
                if (event.target === event.currentTarget) paymentQrDialog.current?.close();
              }}
              className="fixed inset-0 !m-0 h-dvh max-h-none w-screen max-w-none bg-black/90 p-6 text-white backdrop:bg-black/90"
            >
              <div className="flex h-full flex-col items-center justify-center gap-5">
                <button
                  type="button"
                  autoFocus
                  onClick={() => paymentQrDialog.current?.close()}
                  className="absolute right-5 top-5 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  Close <span aria-hidden="true">×</span>
                </button>
                <Image
                  src={eventSettings.payment_qr_url}
                  alt="Payment QR code"
                  width={768}
                  height={916}
                  className="max-h-[calc(100dvh-8rem)] w-auto max-w-[90vw] rounded-xl bg-white object-contain p-2"
                />
                {eventSettings.payment_upi_id && <p className="text-center text-sm font-semibold">UPI ID: {eventSettings.payment_upi_id}</p>}
              </div>
            </dialog>
          )}
          <h3 className="font-display font-semibold text-brand-950">Payment details</h3>
          <div className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <p>Fee: <strong>₹{eventSettings ? eventSettings.external_fee_per_member * members.length : "—"}</strong> for this team ({members.length} members).</p>
            {eventSettings?.payment_instructions && <p className="mt-2 whitespace-pre-wrap">{eventSettings.payment_instructions}</p>}
            <p className="mt-2">Enter your transaction details and attach the payment proof.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Transaction ID *" name="transactionId" value={form.transactionId} onChange={updateForm} error={errors.transactionId} />
            <label><span className="label">Payment date *</span><input className="input" type="date" name="paymentDate" value={form.paymentDate} onChange={updateForm} />{errors.paymentDate && <p className="field-error">{errors.paymentDate}</p>}</label>
            <label><span className="label">Payment time *</span><input className="input" type="time" name="paymentTime" value={form.paymentTime} onChange={updateForm} />{errors.paymentTime && <p className="field-error">{errors.paymentTime}</p>}</label>
            <div className="sm:col-span-2"><FileField label="Payment screenshot *" name="paymentScreenshot" file={paymentScreenshot} onChange={setPaymentScreenshot} error={errors.paymentScreenshot} /></div>
          </div>
        </section>
      )}

      {submitError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>}
      <button type="submit" disabled={loading || !eventSettings?.registration_open || Boolean(settingsError)} className="btn-primary w-full">
        {loading ? "Submitting securely..." : "Submit team registration"}
      </button>
      <p className="text-center text-xs leading-5 text-ink-mute">By submitting, you confirm that the information is accurate and that your team agrees to the event guidelines.</p>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="input" name={name} value={value} onChange={onChange} autoComplete="off" />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function FileField({
  label,
  name,
  file,
  onChange,
  error,
}: {
  label: string;
  name: string;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="block w-full rounded-xl border border-brand-200 bg-white px-3 py-3 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-800"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <span className="mt-1 block text-xs text-ink-mute">JPG, PNG, or WebP; maximum 3 MB. {file ? `Selected: ${file.name}` : ""}</span>
      {error && <span className="field-error">{error}</span>}
      <input type="hidden" name={name} />
    </label>
  );
}
