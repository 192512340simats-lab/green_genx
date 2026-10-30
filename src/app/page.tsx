import Link from "next/link";
import Image from "next/image";
import Countdown from "@/components/Countdown";
import { publicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const themes = [
  {
    number: "01",
    title: "Renewable energy",
    description: "Imagine better ways to generate, store, and share clean power.",
  },
  {
    number: "02",
    title: "Waste to worth",
    description: "Build ideas for recycling, reducing waste, and a circular future.",
  },
  {
    number: "03",
    title: "Smarter agriculture",
    description: "Use technology to help farms grow more while using less.",
  },
  {
    number: "04",
    title: "Water for everyone",
    description: "Protect, monitor, and make every drop go further.",
  },
  {
    number: "05",
    title: "Greener mobility",
    description: "Make the way we move cleaner, safer, and more accessible.",
  },
  {
    number: "06",
    title: "Sustainable cities",
    description: "Create thoughtful infrastructure for people and the planet.",
  },
];

const schedule: [string, string, string][] = [
  ["09:00 AM", "Check-in & team registration", "Get settled, meet the organizers, and find your team space."],
  ["10:00 AM", "Welcome to Green GenX", "Opening remarks, event briefing, and the challenge reveal."],
  ["10:30 AM", "Build for a better tomorrow", "Eight hours to turn a green idea into a working prototype."],
  ["01:00 PM", "Recharge & refuel", "Lunch break, mentor conversations, and a chance to reset."],
  ["04:00 PM", "Show what you made", "Present your solution and the impact it could create."],
  ["05:00 PM", "Celebration & closing", "Awards, acknowledgements, and closing ceremony."],
];

const rules = [
  "Teams must have 3 to 4 members.",
  "Every participant must carry a valid college ID card.",
  "Please be present for check-in and follow the event schedule.",
  "Projects should be created during the event and relate to a sustainability challenge.",
  "Be respectful of other teams, mentors, organizers, and the venue.",
];
const objectives = [
  "Encourage students to build technology-driven solutions for environmental challenges.",
  "Promote sustainable thinking across engineering disciplines.",
  "Provide a collaborative platform for teams from different colleges.",
  "Connect innovative green ideas with practical engineering.",
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const defaults = {
    event_name: "GREEN GENX",
    tagline: "Where Green Ideas Meet Technology",
    about: "Green GenX is an innovation event for students who believe technology can help the planet thrive. Bring your curiosity, collaborate across disciplines, and build a solution with real-world potential.",
    event_date: "2026-11-19T09:00:00+05:30",
    venue: "SIMATS Engineering Premises",
    duration_text: "8 Hours",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    registration_open: true,
  };
  let event = defaults;
  let liveThemes = themes;
  let liveSchedule = schedule;
  let liveRules = rules;
  let liveObjectives = objectives;
  const setupNeeded = !publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey;
  if (!setupNeeded) {
    const supabase = await createSupabaseServerClient();
    const [
      { data, error },
      { data: objectiveRows, error: objectivesError },
      { data: themeRows, error: themesError },
      { data: scheduleRows, error: scheduleError },
      { data: ruleRows, error: rulesError },
    ] = await Promise.all([
      supabase.from("event_settings").select("event_name, tagline, about, event_date, venue, duration_text, contact_name, contact_phone, contact_email, registration_open, registration_deadline").eq("id", 1).single(),
      supabase.from("objectives").select("body").order("sort_order"),
      supabase.from("themes").select("title, description").order("sort_order"),
      supabase.from("schedule_items").select("time_label, title, description").order("sort_order"),
      supabase.from("rules").select("body").order("sort_order"),
    ]);
    if (error || !data) throw new Error(`Could not load event information: ${error?.message ?? "No settings row found."}`);
    if (objectivesError || themesError || scheduleError || rulesError) {
      throw new Error(`Could not load public content: ${objectivesError?.message ?? themesError?.message ?? scheduleError?.message ?? rulesError?.message}`);
    }
    const deadlinePassed = data.registration_deadline
      ? new Date(data.registration_deadline).getTime() < Date.now()
      : false;
    event = {
      event_name: data.event_name,
      tagline: data.tagline,
      about: data.about || defaults.about,
      event_date: data.event_date,
      venue: data.venue,
      duration_text: data.duration_text,
      contact_name: data.contact_name,
      contact_phone: data.contact_phone,
      contact_email: data.contact_email,
      registration_open: data.registration_open && !deadlinePassed,
    };
    liveObjectives = (objectiveRows ?? []).map((item) => item.body);
    liveThemes = (themeRows ?? []).map((item, index) => ({
      number: String(index + 1).padStart(2, "0"),
      title: item.title,
      description: item.description,
    }));
    liveSchedule = (scheduleRows ?? []).map((item) => [item.time_label, item.title, item.description]);
    liveRules = (ruleRows ?? []).map((item) => item.body);
  }
  const eventDate = new Date(event.event_date);
  const eventDateLabel = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(eventDate);

  return (
    <main>
      {setupNeeded && <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-950">Preview mode: connect Supabase to enable registration and live event settings.</div>}
      <header className="site-header">
        <div className="container-page flex h-20 items-center justify-between gap-5">
          <Link href="/" className="brand-lockup" aria-label="Green GenX home">
            <span className="brand-mark" aria-hidden="true">G</span>
            <span>
              <span className="block font-display text-lg font-bold leading-tight tracking-tight">{event.event_name}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-mute">Ideas for a living planet</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex" aria-label="Main navigation">
            <a href="#about" className="nav-link">About</a>
            <a href="#themes" className="nav-link">Themes</a>
            <a href="#schedule" className="nav-link">Schedule</a>
            <a href="#faq" className="nav-link">FAQs</a>
          </nav>

          <details className="relative md:hidden">
            <summary className="btn-secondary cursor-pointer list-none px-3 py-2 text-sm">Menu</summary>
            <nav aria-label="Mobile navigation" className="absolute right-0 top-full z-40 mt-2 grid min-w-44 gap-1 rounded-xl border border-brand-100 bg-white p-2 text-sm font-medium text-ink-soft shadow-card">
              <a href="#about" className="rounded-lg px-3 py-2 hover:bg-brand-50">About</a>
              <a href="#themes" className="rounded-lg px-3 py-2 hover:bg-brand-50">Themes</a>
              <a href="#schedule" className="rounded-lg px-3 py-2 hover:bg-brand-50">Schedule</a>
              <a href="#faq" className="rounded-lg px-3 py-2 hover:bg-brand-50">FAQs</a>
            </nav>
          </details>

          <Link href="/register" className="btn-primary px-4 py-2.5">
            {event.registration_open ? "Register your team" : "Registration closed"} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <section className="hero-section relative overflow-hidden">
        <div className="hero-orb hero-orb-one" aria-hidden="true" />
        <div className="hero-orb hero-orb-two" aria-hidden="true" />
        <div className="container-page relative grid min-h-[640px] items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="max-w-2xl animate-fade-up">
            <p className="eyebrow"><span className="eyebrow-dot" /> DEPARTMENT OF ENVIRONMENTAL BIOTECHNOLOGY · SIMATS ENGINEERING</p>
            <h1 className="mt-7 max-w-2xl whitespace-nowrap font-display text-[clamp(2rem,5.8vw,4.5rem)] font-semibold leading-[1.08] tracking-[-0.055em] text-white">
              GREEN
              <span className="hero-highlight"> GEN_X</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
              {event.tagline}. Join a new generation of changemakers building technology for a greener tomorrow.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/register" className="btn-hero">
                Find your team&apos;s next idea <span aria-hidden="true">→</span>
              </Link>
              <a href="#about" className="inline-flex items-center gap-2 px-2 py-3 text-sm font-semibold text-white/80 transition hover:text-white">
                Explore the event <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="mt-7 text-sm text-white/55">Open to internal and external student teams · 3–4 members per team</p>
          </div>

          <div className="relative mx-auto w-full max-w-[500px] animate-fade-up [animation-delay:120ms]">
            <div className="hero-art">
              <Image
                src="/green-genx-logo.png"
                alt="Green GenX Hackathon 2026 — Where Green Ideas Meet Technology"
                width={768}
                height={768}
                priority
                className="hero-logo"
              />
            </div>
            <div className="hero-date-card">
              <span className="hero-date-icon" aria-hidden="true">19</span>
              <span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute">Save the date</span>
                <span className="mt-1 block font-display text-sm font-semibold text-ink">{eventDateLabel}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="hero-bottom-line" aria-hidden="true" />
      </section>

      <section className="countdown-wrap">
        <div className="container-page">
          <div className="countdown-panel">
            <div>
              <p className="eyebrow eyebrow-dark">The countdown is on</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-brand-900">Meet us where ideas take root.</h2>
            </div>
            <Countdown targetDate={event.event_date} />
            <Link href="/register" className="countdown-link">Join the event <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section id="about" className="section-space">
        <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <p className="eyebrow eyebrow-dark"><span className="eyebrow-dot" /> About Green GenX</p>
            <h2 className="section-title mt-5">Small teams.<br />Big possibilities.</h2>
            <p className="mt-6 max-w-md leading-7 text-ink-soft">
              {event.about}
            </p>
            <a href="#schedule" className="text-link mt-7">See how the day unfolds <span aria-hidden="true">→</span></a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="about-card about-card-green">
              <span className="about-card-number">01</span>
              <h3>Make it matter</h3>
              <p>Take on a challenge that connects engineering, innovation, and environmental impact.</p>
            </article>
            <article className="about-card about-card-light sm:mt-12">
              <span className="about-card-number">02</span>
              <h3>Build together</h3>
              <p>Bring together 3–4 teammates, share different perspectives, and create as one.</p>
            </article>
            <article className="about-card about-card-light">
              <span className="about-card-number">03</span>
              <h3>Learn by doing</h3>
              <p>Turn a promising idea into a prototype and tell the story behind your solution.</p>
            </article>
            <article className="about-card about-card-cream sm:mt-12">
              <span className="about-card-number">04</span>
              <h3>Leave inspired</h3>
              <p>Meet fellow builders and leave with new skills, connections, and momentum.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="event-strip">
        <div className="container-page grid gap-7 py-9 sm:grid-cols-3">
          <div className="event-fact"><span className="event-fact-icon" aria-hidden="true">◷</span><span><span className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Duration</span><strong>{event.duration_text} of making</strong></span></div>
          <div className="event-fact"><span className="event-fact-icon" aria-hidden="true">⌖</span><span><span className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Where</span><strong>{event.venue}</strong></span></div>
          <div className="event-fact"><span className="event-fact-icon" aria-hidden="true">◇</span><span><span className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Who</span><strong>Student teams of 3–4</strong></span></div>
        </div>
      </section>

      <section className="border-b border-brand-100 bg-white py-14 sm:py-18">
        <div className="container-page">
          <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr] md:items-start">
            <div><p className="eyebrow eyebrow-dark">Our purpose</p><h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-brand-950">What we want to grow.</h2></div>
            <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {liveObjectives.map((objective, index) => <li key={`${index}-${objective}`} className="flex gap-3 text-sm leading-6 text-ink-soft"><span className="mt-0.5 font-display text-xs font-bold text-brand-500">{String(index + 1).padStart(2, "0")}</span><span>{objective}</span></li>)}
            </ul>
          </div>
        </div>
      </section>

      <section id="themes" className="section-space bg-brand-50/60">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow eyebrow-dark"><span className="eyebrow-dot" /> Find your focus</p>
              <h2 className="section-title mt-5">A greener world<br />starts with a question.</h2>
            </div>
            <p className="max-w-sm leading-7 text-ink-soft">Choose a challenge that matters to you. These themes are starting points—follow the problem wherever your team’s curiosity leads.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveThemes.map((theme) => (
              <article key={theme.number} className="theme-card">
                <span className="theme-number">{theme.number}</span>
                <span className="theme-icon" aria-hidden="true">{["☼", "↻", "⌁", "≈", "↗", "▦"][Number(theme.number) - 1]}</span>
                <h3>{theme.title}</h3>
                <p>{theme.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {(event.contact_name || event.contact_phone || event.contact_email) && (
        <section className="border-y border-brand-100 bg-white py-10 sm:py-12">
          <div className="container-page flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow eyebrow-dark"><span className="eyebrow-dot" /> Student organizer details</p>
              {event.contact_name && <h2 className="mt-3 font-display text-xl font-semibold text-brand-950">{event.contact_name}</h2>}
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-brand-700">
              {event.contact_phone && <a className="transition hover:text-brand-900" href={`tel:${event.contact_phone}`}>{event.contact_phone}</a>}
              {event.contact_email && <a className="transition hover:text-brand-900" href={`mailto:${event.contact_email}`}>{event.contact_email}</a>}
            </div>
          </div>
        </section>
      )}

      <section id="schedule" className="section-space">
        <div className="container-page grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24">
          <div>
            <p className="eyebrow eyebrow-dark"><span className="eyebrow-dot" /> One day, many possibilities</p>
            <h2 className="section-title mt-5">Your day to<br />make a difference.</h2>
            <p className="mt-6 max-w-sm leading-7 text-ink-soft">A full day of inspiration, collaboration, and hands-on building. Times may be updated by the organizers.</p>
            <div className="schedule-note mt-8"><span aria-hidden="true">✳</span><p>Bring your laptop, charger, college ID, and an open mind.</p></div>
          </div>
          <ol className="timeline">
            {liveSchedule.map(([time, title, description], index) => (
              <li key={time} className="timeline-item">
                <span className="timeline-marker">{String(index + 1).padStart(2, "0")}</span>
                <div className="timeline-content">
                  <span className="timeline-time">{time}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="faq" className="section-space faq-section">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <p className="eyebrow eyebrow-dark"><span className="eyebrow-dot" /> The essentials</p>
            <h2 className="section-title mt-5">Good to know<br />before you go.</h2>
            <p className="mt-6 leading-7 text-ink-soft">A few friendly guidelines to help your team have a great day.</p>
            <Link href="/status" className="text-link mt-7">Already registered? Check your status <span aria-hidden="true">→</span></Link>
          </div>
          <div className="space-y-3">
            {liveRules.map((rule, index) => (
              <details key={rule} className="faq-item">
                <summary><span className="faq-index">0{index + 1}</span><span>{rule}</span><span className="faq-plus" aria-hidden="true">+</span></summary>
                <p>{index === 0 ? "Your team can include three or four participants. The person listed first in your registration will be the team leader." : "Please check the event instructions and keep in touch with the organizers if you need help or have questions."}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="closing-cta">
        <div className="container-page relative overflow-hidden py-16 text-center sm:py-20">
          <span className="cta-decoration cta-decoration-a" aria-hidden="true">✳</span>
          <span className="cta-decoration cta-decoration-b" aria-hidden="true">✳</span>
          <p className="eyebrow justify-center text-white/60">Your idea belongs here</p>
          <h2 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-5xl">Let’s make something good grow.</h2>
          <p className="mx-auto mt-5 max-w-xl leading-7 text-white/70">Gather your team and be part of a day where fresh ideas can take root.</p>
          <Link href="/register" className="btn-hero mt-8">Register your team <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container-page flex flex-col gap-7 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="brand-lockup text-white">
            <span className="brand-mark brand-mark-footer" aria-hidden="true">G</span>
            <span><span className="block font-display text-base font-bold tracking-tight">GREEN GENX</span><span className="text-xs text-white/50">Where Green Ideas Meet Technology</span></span>
          </Link>
          <p className="text-sm text-white/45">© 2026 Green GenX · SIMATS Engineering</p>
          <div className="flex items-center gap-5 text-sm text-white/60">
            <Link href="/status" className="hover:text-white">Check registration</Link>
            <Link href="/dashboard" className="hover:text-white">Public dashboard</Link>
            <Link href="/admin" className="hover:text-white">Organizer login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
