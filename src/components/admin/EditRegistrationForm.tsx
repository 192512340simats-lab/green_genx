"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function EditRegistrationForm({
  id,
  teamName,
  projectTitle,
  collegeName,
  department,
  yearOfStudy,
  leaderRegNo,
}: {
  id: string;
  teamName: string;
  projectTitle: string;
  collegeName: string;
  department: string;
  yearOfStudy: number;
  leaderRegNo: string | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState({ teamName, projectTitle, collegeName, department, yearOfStudy: String(yearOfStudy), leaderRegNo: leaderRegNo ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          teamName: values.teamName,
          projectTitle: values.projectTitle,
          collegeName: values.collegeName,
          department: values.department,
          yearOfStudy: values.yearOfStudy,
          ...(leaderRegNo !== null ? { leaderRegNo: values.leaderRegNo } : {}),
        }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not save registration edits.");
        return;
      }
      setMessage(result.message ?? "Registration details saved.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="card">
      <summary className="cursor-pointer list-none font-display text-lg font-semibold text-brand-950">Edit team details <span className="ml-2 text-sm font-normal text-brand-600">+</span></summary>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <TextField label="Team name" value={values.teamName} onChange={(teamName) => setValues((current) => ({ ...current, teamName }))} />
        <TextField label="Project title" value={values.projectTitle} onChange={(projectTitle) => setValues((current) => ({ ...current, projectTitle }))} />
        <TextField label="College / institution" value={values.collegeName} onChange={(collegeName) => setValues((current) => ({ ...current, collegeName }))} />
        <TextField label="Department" value={values.department} onChange={(department) => setValues((current) => ({ ...current, department }))} />
        <label><span className="label">Year of study</span><select className="input" value={values.yearOfStudy} onChange={(event) => setValues((current) => ({ ...current, yearOfStudy: event.target.value }))}>{[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
        {leaderRegNo !== null && <TextField label="Leader registration number" value={values.leaderRegNo} onChange={(leaderRegNo) => setValues((current) => ({ ...current, leaderRegNo }))} />}
        {message && <p role="status" className="text-sm text-brand-700">{message}</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-secondary w-full" disabled={saving}>{saving ? "Saving..." : "Save edits"}</button>
      </form>
    </details>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="label">{label}</span><input className="input" value={value} onChange={(event) => onChange(event.target.value)} required /></label>;
}
