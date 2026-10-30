/**
 * Zod validation schemas shared by the browser forms (instant feedback) and
 * the server route handlers (the real enforcement). Safe to import in client
 * components: this file has no server-only imports.
 *
 * Fee totals, registration IDs, status and payment status are deliberately NOT
 * part of any public schema - the server computes or controls them.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Collapses internal whitespace and trims. */
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

const text = (label: string, min: number, max: number) =>
  z
    .string({ error: `${label} is required.` })
    .transform(clean)
    .pipe(
      z
        .string()
        .min(min, `${label} must be at least ${min} characters.`)
        .max(max, `${label} must be at most ${max} characters.`)
    );

/** Names: letters (any language), spaces and . ' - only. */
const personName = (label: string) =>
  text(label, 2, 100).pipe(
    z.string().regex(/^[\p{L}][\p{L}\p{M} .'\-]*$/u, `${label} contains invalid characters.`)
  );

export const emailSchema = z
  .string({ error: "Email is required." })
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.string().email("Enter a valid email address.").max(254, "Email is too long."));

/**
 * Indian mobile number. Accepts "9876543210", "+91 98765 43210", "098765-43210"
 * and normalises to the 10-digit form.
 */
export const phoneSchema = z
  .string({ error: "Mobile number is required." })
  .transform((s) => {
    let d = s.replace(/[\s\-().]/g, "");
    if (d.startsWith("+91")) d = d.slice(3);
    else if (d.startsWith("91") && d.length === 12) d = d.slice(2);
    else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
    return d;
  })
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."));

/** Today's date (YYYY-MM-DD) in Indian Standard Time. */
export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/* ------------------------------------------------------------------ */
/* Team members                                                        */
/* ------------------------------------------------------------------ */

export const teamMemberSchema = z.object({
  fullName: personName("Name"),
  email: emailSchema,
  phone: phoneSchema,
});
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;

export const MIN_TEAM_SIZE = 3;
export const MAX_TEAM_SIZE = 4;

/** Members 1..n. Member #1 is the team leader. No duplicate emails or phones. */
const membersSchema = z
  .array(teamMemberSchema)
  .min(MIN_TEAM_SIZE, `A team needs at least ${MIN_TEAM_SIZE} members.`)
  .max(MAX_TEAM_SIZE, `A team can have at most ${MAX_TEAM_SIZE} members.`)
  .superRefine((members, ctx) => {
    const emails = new Map<string, number>();
    const phones = new Map<string, number>();
    members.forEach((m, i) => {
      if (emails.has(m.email)) {
        ctx.addIssue({
          code: "custom",
          path: [i, "email"],
          message: `Same email as member ${emails.get(m.email)! + 1}. Each member needs a unique email.`,
        });
      } else emails.set(m.email, i);

      if (phones.has(m.phone)) {
        ctx.addIssue({
          code: "custom",
          path: [i, "phone"],
          message: `Same mobile number as member ${phones.get(m.phone)! + 1}. Each member needs a unique number.`,
        });
      } else phones.set(m.phone, i);
    });
  });

/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */

const teamBase = {
  teamName: text("Team name", 2, 80),
  collegeName: text("College name", 2, 150),
  department: text("Department", 2, 100),
  yearOfStudy: z.coerce
    .number({ error: "Select the year of study." })
    .int()
    .min(1, "Select the year of study.")
    .max(6, "Select the year of study."),
  projectTitle: text("Project title", 2, 150),
  members: membersSchema,
};

/** College registration number: letters, digits, / and - (e.g. 192512340). */
const regNoSchema = z
  .string({ error: "Registration number is required." })
  .transform((s) => s.trim().toUpperCase())
  .pipe(
    z
      .string()
      .min(5, "Enter the leader's college registration number.")
      .max(20, "Registration number is too long.")
      .regex(/^[A-Z0-9][A-Z0-9/\-]*$/, "Registration number may contain only letters, digits, / and -.")
  );

export const internalRegistrationSchema = z.object({
  category: z.literal("internal"),
  ...teamBase,
  leaderRegNo: regNoSchema,
});

const timeSchema = z
  .string({ error: "Payment time is required." })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter the payment time as HH:MM (24-hour).");

const paymentDateSchema = z
  .string({ error: "Payment date is required." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the payment date.")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Enter a valid payment date.")
  .refine((d) => d <= todayIST(), "Payment date cannot be in the future.")
  .refine((d) => d >= "2024-01-01", "Enter a valid payment date.");

const transactionIdSchema = z
  .string({ error: "Transaction ID is required." })
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(6, "Transaction ID is too short.")
      .max(40, "Transaction ID is too long.")
      .regex(/^[A-Za-z0-9\-_/]+$/, "Transaction ID may contain only letters, digits, - _ and /.")
  );

export const externalRegistrationSchema = z.object({
  category: z.literal("external"),
  ...teamBase,
  transactionId: transactionIdSchema,
  paymentDate: paymentDateSchema,
  paymentTime: timeSchema,
});

export const registrationSchema = z.discriminatedUnion("category", [
  internalRegistrationSchema,
  externalRegistrationSchema,
]);

export type InternalRegistrationInput = z.infer<typeof internalRegistrationSchema>;
export type ExternalRegistrationInput = z.infer<typeof externalRegistrationSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;

/** Turns a ZodError into { "members.0.email": "message", ... } for forms. */
export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Public status lookup / verification                                 */
/* ------------------------------------------------------------------ */

export const registrationCodeSchema = z
  .string({ error: "Registration ID is required." })
  .transform((s) => s.trim().toUpperCase())
  .pipe(z.string().regex(/^GGX-(INT|EXT)-\d{4}-\d{3,6}$/, "Enter a valid registration ID, e.g. GGX-INT-2026-001."));

/** 24 random bytes encoded as base64url = exactly 32 characters. */
export const statusTokenSchema = z
  .string({ error: "Status access token is required." })
  .transform((s) => s.trim())
  .pipe(z.string().regex(/^[A-Za-z0-9_-]{32}$/, "The status access token is not valid."));

export const statusLookupSchema = z.object({
  registrationCode: registrationCodeSchema,
  token: statusTokenSchema,
});

/* ------------------------------------------------------------------ */
/* Admin authentication                                                */
/* ------------------------------------------------------------------ */

export const adminMagicLinkSchema = z.object({
  email: emailSchema,
});
export type AdminMagicLinkInput = z.infer<typeof adminMagicLinkSchema>;

/* ------------------------------------------------------------------ */
/* Admin: update a registration                                        */
/* ------------------------------------------------------------------ */

/** Editable fields for an existing registration (admin only). */
export const adminEditRegistrationSchema = z.object({
  teamName: text("Team name", 2, 80).optional(),
  collegeName: text("College name", 2, 150).optional(),
  department: text("Department", 2, 100).optional(),
  yearOfStudy: z.coerce.number().int().min(1).max(6).optional(),
  projectTitle: text("Project title", 2, 150).optional(),
  leaderRegNo: regNoSchema.optional(), // internal teams only (checked in the route)
  transactionId: transactionIdSchema.optional(), // external teams only
  paymentDate: paymentDateSchema.optional(),
  paymentTime: timeSchema.optional(),
  members: membersSchema.optional(),
});

export const adminRegistrationActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("reject"),
    reason: text("Rejection reason", 3, 500),
  }),
  z.object({ action: z.literal("reopen") }), // back to pending
  z.object({
    action: z.literal("set_payment"),
    paymentStatus: z.enum(["pending", "verified"]),
  }),
  z.object({ action: z.literal("edit"), changes: adminEditRegistrationSchema }),
]);
export type AdminRegistrationAction = z.infer<typeof adminRegistrationActionSchema>;

/* ------------------------------------------------------------------ */
/* Admin: event settings                                               */
/* ------------------------------------------------------------------ */

const isoDateTime = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), "Enter a valid date and time.")
  .transform((s) => new Date(s).toISOString());

const upiSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .max(100)
      .refine((s) => s === "" || /^[A-Za-z0-9._\-]{2,64}@[A-Za-z][A-Za-z0-9.\-]{1,63}$/.test(s), "Enter a valid UPI ID, e.g. name@bank.")
  );

const instagramSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .max(200)
      .refine((s) => {
        if (s === "") return true;
        try {
          const u = new URL(s);
          return u.protocol === "https:" && /(^|\.)instagram\.com$/i.test(u.hostname);
        } catch {
          return false;
        }
      }, "Enter a full https://instagram.com/... link.")
  );

const optionalPhone = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .max(20)
      .refine((s) => s === "" || /^[+\d][\d\s\-]{6,18}$/.test(s), "Enter a valid phone number.")
  );

const optionalEmail = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.string().max(254).refine((s) => s === "" || z.string().email().safeParse(s).success, "Enter a valid email."));

export const eventSettingsSchema = z.object({
  event_name: text("Event name", 2, 80),
  tagline: text("Tagline", 2, 160),
  about: z.string().transform((s) => s.trim()).pipe(z.string().max(4000)),
  event_date: isoDateTime,
  venue: text("Venue", 2, 200),
  duration_text: text("Duration", 1, 60),
  registration_open: z.boolean(),
  registration_deadline: z.union([isoDateTime, z.literal(""), z.null()]).transform((v) => (v ? v : null)),
  // Only the EXTERNAL fee is configurable. Internal registration is always free.
  external_fee_per_member: z.coerce
    .number({ error: "Enter the fee as a number." })
    .int("Fee must be a whole number.")
    .min(0, "Fee cannot be negative.")
    .max(100000, "Fee is too large."),
  payment_upi_id: upiSchema,
  payment_instructions: z.string().transform((s) => s.trim()).pipe(z.string().max(2000)),
  contact_name: z.string().transform(clean).pipe(z.string().max(100)),
  contact_phone: optionalPhone,
  contact_email: optionalEmail,
  instagram_url: instagramSchema,
});
export type EventSettingsInput = z.infer<typeof eventSettingsSchema>;

export const objectiveListSchema = z
  .array(z.object({ body: text("Objective", 2, 300) }))
  .max(20, "At most 20 objectives.");

export const themeListSchema = z
  .array(
    z.object({
      title: text("Theme title", 2, 80),
      description: z.string().transform((s) => s.trim()).pipe(z.string().max(300)),
    })
  )
  .max(20, "At most 20 themes.");

export const scheduleListSchema = z
  .array(
    z.object({
      time_label: text("Time", 1, 30),
      title: text("Title", 2, 100),
      description: z.string().transform((s) => s.trim()).pipe(z.string().max(300)),
    })
  )
  .max(40, "At most 40 schedule items.");

export const ruleListSchema = z
  .array(z.object({ body: text("Rule", 2, 300) }))
  .max(30, "At most 30 rules.");

export const contentSettingsSchema = z.object({
  settings: eventSettingsSchema,
  objectives: objectiveListSchema,
  themes: themeListSchema,
  schedule: scheduleListSchema,
  rules: ruleListSchema,
});
export type ContentSettingsInput = z.infer<typeof contentSettingsSchema>;

/** Admin registration list filters (query string). */
export const registrationListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["all", "pending", "approved", "rejected"]).default("all"),
  payment: z.enum(["all", "pending", "verified"]).default("all"),
});
