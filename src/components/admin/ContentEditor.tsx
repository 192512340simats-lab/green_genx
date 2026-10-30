"use client";

import { useState, type FormEvent } from "react";

type ThemeItem = { title: string; description: string };
type ScheduleItem = { time_label: string; title: string; description: string };

export default function ContentEditor({
  objectives,
  themes,
  schedule,
  rules,
}: {
  objectives: string[];
  themes: ThemeItem[];
  schedule: ScheduleItem[];
  rules: string[];
}) {
  const [values, setValues] = useState({
    objectives: objectives.join("\n"),
    themes: themes.map((item) => `${item.title} | ${item.description}`).join("\n"),
    schedule: schedule.map((item) => `${item.time_label} | ${item.title} | ${item.description}`).join("\n"),
    rules: rules.join("\n"),
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const themesData = values.themes.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const [title = "", ...description] = line.split("|");
      return { title: title.trim(), description: description.join("|").trim() };
    });
    const scheduleData = values.schedule.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const [time_label = "", title = "", ...description] = line.split("|");
      return { time_label: time_label.trim(), title: title.trim(), description: description.join("|").trim() };
    });
    const body = {
      objectives: values.objectives.split("\n").map((line) => line.trim()).filter(Boolean).map((body) => ({ body })),
      themes: themesData,
      schedule: scheduleData,
      rules: values.rules.split("\n").map((line) => line.trim()).filter(Boolean).map((body) => ({ body })),
    };

    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not save event content.");
        return;
      }
      setMessage(result.message ?? "Event content saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="card">
        <h2 className="font-display text-lg font-semibold text-brand-950">Public website content</h2>
        <p className="mt-1 text-sm leading-6 text-ink-soft">One item per line. For themes use “Title | Description”; for schedule use “Time | Title | Description”. The save is applied atomically.</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <TextArea label="Objectives" value={values.objectives} onChange={(objectives) => setValues((current) => ({ ...current, objectives }))} />
          <TextArea label="Rules" value={values.rules} onChange={(rules) => setValues((current) => ({ ...current, rules }))} />
          <TextArea label="Themes" value={values.themes} onChange={(themes) => setValues((current) => ({ ...current, themes }))} />
          <TextArea label="Schedule" value={values.schedule} onChange={(schedule) => setValues((current) => ({ ...current, schedule }))} />
        </div>
      </section>
      {message && <p role="status" className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800">{message}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>{saving ? "Saving..." : "Save public content"}</button>
    </form>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="label">{label}</span><textarea className="input min-h-48 resize-y font-mono text-sm leading-6" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
