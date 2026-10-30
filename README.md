# GREEN GENX

The Green GenX event website and team-registration portal, built with Next.js 15, React, TypeScript, Tailwind CSS, and Supabase.

## Requirements

- Node.js 22 or newer
- A Supabase project
- npm

## Local setup

1. Install dependencies:

   ```powershell
   npm.cmd ci
   ```

2. Copy the environment template:

   ```powershell
   Copy-Item .env.local.example .env.local
   ```

3. In Supabase, open **SQL Editor** and run these files in order:

   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_rate_limit.sql`
   3. `supabase/migrations/0003_admin_content.sql`
   4. `supabase/migrations/0004_public_registration_count.sql`

   The first migration creates the schema, RLS policies, and storage buckets. The second enables atomic rate limiting. The third enables atomic content editing in the organizer settings. The fourth exposes only an aggregate team count to the public dashboard; participant records remain private.

4. Copy the project URL, anon key, and service-role key from **Supabase → Project Settings → API** into `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   APP_SECRET=PASTE_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   Generate an `APP_SECRET` in PowerShell with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   **Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code or commit it to source control.** The `.env.local` file is ignored by Git.

5. Configure organizer email sign-in and create the organizer account:

   - In Supabase **Authentication → Providers → Email**, disable public sign-ups.
   - Keep the Email provider enabled and configure SMTP for reliable delivery in production.
   - In **Authentication → URL Configuration**, set the Site URL to `NEXT_PUBLIC_SITE_URL` and add the exact callback URL `NEXT_PUBLIC_SITE_URL/auth/callback` to the redirect URL allow-list. For local development, use the same port as the running Next.js server (for example, `http://localhost:3001/auth/callback`).
   - In **Authentication → Email Templates → Magic Link**, keep the Supabase confirmation link (`{{ .ConfirmationURL }}`) so Supabase verifies the one-time link and redirects through the callback.
   - Set a short email OTP expiry in Supabase Auth settings. Magic links are single-use; expired or previously used links must be requested again.
   - In **Authentication → Users**, create and confirm the organizer account. A password may be required by the dashboard when creating the user, but organizers sign in through the email link.
   - In `supabase/create_admin.sql`, replace the example email with that account’s email and run the SQL in Supabase.

6. Start the website:

   ```powershell
   npm.cmd run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

Without Supabase environment variables, the homepage remains available in preview mode. Registration, status lookup, organizer access, uploads, and exports need the database configuration above.

Organizer sign-in sends a one-time email link only when the submitted address is present in `public.admin_profiles`. The callback exchanges the Supabase PKCE code for the normal cookie-backed session and checks the allow-list again before opening the dashboard. Add the exact production callback URL (for example, `https://your-domain.example/auth/callback`) to Supabase’s redirect allow-list and set `NEXT_PUBLIC_SITE_URL` to that HTTPS origin in Vercel. Do not enable public sign-ups.

## Website features

- Responsive Green GenX event homepage with live event details, countdown, themes, schedule, objectives, and rules.
- Internal and external team registration for 3–4 participants.
- Server-side validation, duplicate checks, atomic registration IDs, payment-fee calculation, rate limiting, and private upload validation.
- One-time status token; public status lookup requires both the registration ID and token.
- Public QR verification page and approved-team PDF gate pass.
- Allow-listed organizer login, registration review, payment verification, approval/rejection, registration edits, short-lived private document previews, XLSX export, and event/content settings.

## Validation

Run the project checks from this folder:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

There is no automated test suite configured yet. The registration and admin flows require a Supabase project to exercise end-to-end.

## Deployment

Deploy the project to Vercel and add the same environment variables in **Project Settings → Environment Variables**. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS website URL, then redeploy. Apply the Supabase SQL files and create the organizer profile before enabling the registration period.

## Security notes

- Public clients have no RLS access to registration records. Sensitive operations use server route handlers.
- The service-role key is server-only and bypasses RLS; only authorized server paths use it.
- Participant documents are stored in the private `participant-docs` bucket and exposed to organizers through signed preview URLs that expire after 60 seconds.
- A document displayed in a browser can still be saved by a determined viewer.
