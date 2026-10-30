"use client";

import { useEffect, useState } from "react";

const units = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
] as const;

type CountdownValues = Record<(typeof units)[number]["key"], number>;

function getTimeLeft(target: number): CountdownValues {
  const remaining = Math.max(0, target - Date.now());
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
    seconds: Math.floor((remaining / 1_000) % 60),
  };
}

export default function Countdown({ targetDate }: { targetDate: string }) {
  const target = new Date(targetDate).getTime();
  const [values, setValues] = useState<CountdownValues | null>(null);

  useEffect(() => {
    const update = () => setValues(getTimeLeft(target));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  return (
    <div className="countdown" aria-label="Countdown to Green GenX">
      {units.map(({ key, label }) => (
        <div className="countdown-unit" key={key}>
          <span className="countdown-value" suppressHydrationWarning>{values ? String(values[key]).padStart(2, "0") : "--"}</span>
          <span className="countdown-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
