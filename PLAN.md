# GREEN GENX — Project Plan (updated after Part 2)

*Where Green Ideas Meet Technology* · 19 Nov 2026 · SIMATS Engineering Premises · 8 hours

## 1. Technology architecture

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15.5.28 (App Router) + React 19 + TypeScript | Server Components + Route Handlers = secure server-side logic. Next 14 is end-of-life with unpatched critical advisories, so 15.5.28 is used. |
| Styling | Tailwind CSS 3 | Fast, responsive, consistent |
| Database | Supabase PostgreSQL | RLS, constraints, atomic functions |
| Auth | Supabase Auth (email + password) | Admin only; no public sign-up |
| Files | Supabase Storage | Private `participant-docs`, public `site-assets` (QR only) |
| Validation | zod | Same schemas client- and server-side |
| PDF | `@react-pdf/renderer` (server) | Reliable server-side PDFs |
| QR | `qrcode` | PNG data URLs for PDF and verify link |
| Excel/CSV | `exceljs` | Admin exports |
| Hosting | Vercel | Free tier works |

**Trust model.** The browser is never trusted. Public users have **no** RLS access to
registrations. All public writes/reads go through server route handlers that use the
service-role key (server-only, never `NEXT_PUBLIC_`). Admin pages verify the Supabase
session **and** an `admin_profiles` row on the server for every request.

## 2. Folder structure

```
green-genx/
├─ supabase/migrations/0001_schema.sql        ✅ done
├─ supabase/migrations/0002_rate_limit.sql    ✅ done (atomic rate limiter)
├─ supabase/migrations/0003_admin_content.sql ✅ done (atomic content editor)
├─ supabase/create_admin.sql                  ✅ done
├─ README.md                                  ✅ setup and deployment guide
├─ .env.local.example                         ✅
├─ src/middleware.ts                          ✅ (session refresh + /admin/* guard; must live in src/)
├─ next.config.mjs  tailwind.config.ts  package.json
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx  globals.css  page.tsx    (public homepage)
│  │  ├─ register/page.tsx                    (team form + one-time success result)
│  │  ├─ status/page.tsx                      (ID + token lookup)
│  │  ├─ verify/[code]/page.tsx               (public QR target)
│  │  ├─ admin/page.tsx                       (login)
│  │  ├─ admin/(dash)/layout.tsx              (server admin guard)
│  │  ├─ admin/(dash)/dashboard/page.tsx
│  │  ├─ admin/(dash)/internal/page.tsx  + [id]/page.tsx
│  │  ├─ admin/(dash)/external/page.tsx  + [id]/page.tsx
│  │  ├─ admin/(dash)/settings/page.tsx
│  │  └─ api/
│  │     ├─ register/route.ts                 (create registration + uploads)
│  │     ├─ status/route.ts                   (lookup with token)
│  │     ├─ gate-pass/route.ts                (PDF download, approved only)
│  │     ├─ admin/login/route.ts              (rate-limited login)
│  │     ├─ admin/logout/route.ts
│  │     ├─ admin/registrations/[id]/route.ts (approve/reject/edit)
│  │     ├─ admin/doc/route.ts                (signed URL, 60 s)
│  │     ├─ admin/settings/route.ts
│  │     ├─ admin/settings/qr/route.ts
│  │     ├─ admin/content/route.ts
│  │     └─ admin/export/route.ts
│  ├─ components/ (event site, registration/status forms, organizer UI)
│  └─ lib/
│     ├─ env.ts  types.ts  http.ts  ✅
│     ├─ supabase/{browser,server,admin,middleware}.ts  ✅
│     ├─ auth.ts          ✅ (getAdmin, requireAdminPage, requireAdminApi)
│     ├─ validation.ts    ✅ (zod 4 schemas)
│     ├─ uploads.ts       ✅ (magic-byte + size checks, signed URLs)
│     ├─ rate-limit.ts    ✅
│     ├─ tokens.ts        ✅ (status token + hash)
│     ├─ gate-pass.tsx    (PDF document)
│     └─ server-config.ts (explicit setup checks)
```

## 3. Database & security plan

Tables: `admin_profiles`, `event_settings` (1 row), `objectives`, `themes`,
`schedule_items`, `rules`, `registration_counters`, `registrations`, `team_members`,
`registration_status_history`, `rate_limits`.

- **Atomic IDs:** `next_registration_code()` uses `INSERT … ON CONFLICT DO UPDATE`, which
  row-locks the counter. Format `GGX-INT-2026-001` / `GGX-EXT-2026-001`.
- **Fees:** computed on the server from `event_settings.external_fee_per_member × members`.
  DB constraints enforce `total_fee = fee × members` for external and `0` for internal
  (a trigger also forces internal to free).
- **Approval guards:** DB constraint blocks external approval unless payment is `verified`;
  rejection requires a reason.
- **Duplicates:** unique team name per category, unique internal leader reg. no., unique
  transaction ID.
- **Status token:** 24-byte random token shown once on the success page; only its SHA-256
  hash is stored. Status lookup needs registration ID **and** token, with rate limiting.
- **Files:** `participant-docs` is private, 3 MB, JPEG/PNG/WebP. Server checks size, MIME
  **and magic bytes**, stores under `random-uuid.ext`. Admin previews use 60-second signed
  URLs from an admin-verified endpoint; the UI has no download button.
- **RLS:** public content tables are read-only for everyone; everything sensitive is
  admin-only; `registration_counters` and `rate_limits` have no policies (service role only).
- **Honest limitation:** an image shown in a browser can always be saved by a determined
  user (right-click / screenshot). "No download buttons + short-lived URLs" reduces
  casual leakage; it can't make viewing impossible.

## 4. Implementation order

1. ✅ Schema, RLS, storage (Part 1; apply migrations 0001–0003)
2. ✅ Project config, env, Supabase clients, validation, auth guard, rate limiter, middleware
3. ✅ Public site (homepage, countdown, sections) + live settings and content
4. ✅ Registration form + `/api/register` + one-time success result
5. ✅ Status page + verification page
6. ✅ Admin login + dashboard overview
7. ✅ Internal/external management, approval, edit, document viewer
8. ✅ Settings editor (content, fee, QR upload, open/closed)
9. ✅ Gate-pass PDF + XLSX export
10. ✅ README: setup, deployment, validation, troubleshooting

## 5. Setup commands (preview; full guide in Part 5)

The repository ships its own pinned `package.json`, so `create-next-app` is **not** needed:

```bash
# Node.js 22 LTS or newer is required
cd green-genx
npm install
cp .env.local.example .env.local      # then fill in the values
npm run dev
```

Security-driven version choices: `next` 15.5.28 (14.x is end-of-life with unpatched
critical advisories), `zod` 4 (3.x has no patch for a memory-exhaustion advisory),
and `overrides` for `uuid` and Next's bundled `postcss`. `npm audit` reports 0 issues.

## 6. Checklist

- [x] `PLAN.md`
- [x] `supabase/migrations/0001_schema.sql`
- [x] `supabase/migrations/0002_rate_limit.sql`
- [x] `supabase/migrations/0003_admin_content.sql`
- [x] `supabase/create_admin.sql`
- [x] Config & libs (Part 2): package.json, tsconfig, tailwind, next.config, env example,
      Supabase clients, validation, auth guards, rate limiter, uploads, tokens, middleware,
      admin login/logout, admin layout guard
- [x] Public pages, registration, status lookup, and verification
- [x] Admin login, dashboard, registration review, settings, exports, and gate pass
- [x] README & build/type/lint checks
- [ ] End-to-end tests against a configured Supabase project
