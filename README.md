# One Read# One Read



> One article. Every morning. Curated for you.> One article. Every morning. Curated for you.



A calm, editorial signup experience for **One Read** — a service that delivers a single curated article summary to your inbox every morning at 7 AM, based on your interests and language preferences.A calm, editorial landing page for **One Read** — a service that delivers a single curated article summary to your inbox every morning at 7 AM, based on your interests and language preferences.



## Stack## Stack



- **Next.js 14** (App Router) + React 18 + TypeScript- Next.js 14 (App Router)

- **Tailwind CSS 3** + `next/font` (Fraunces serif + Inter sans)- React 18 + TypeScript

- **Prisma 5** + PostgreSQL- Tailwind CSS 3

- **Resend** for transactional email- `next/font` (Fraunces serif + Inter sans)

- All visuals are inline SVG — no image assets- Inline SVG illustration — **no image assets**



## Project structure## Run locally



``````bash

app/npm install

  layout.tsx                          Root layout, fonts, metadatanpm run dev

  page.tsx                            Two-step signup flow + success```

  globals.css                         Tailwind base + paper-grain background

  api/Open [http://localhost:3000](http://localhost:3000).

    signup/start/route.ts             POST /api/signup/start (save email)

    signup/preferences/route.ts       POST /api/signup/preferences (save prefs + email)## Project structure

components/

  Wordmark.tsx                        Top "One · Read" mark```

  MorningIcon.tsx                     Inline SVG sunrise illustrationapp/

  SignupForm.tsx                      Multi-step form (email → preferences)  layout.tsx        # Root layout, fonts, metadata

  InterestChip.tsx                    Soft toggle chip  page.tsx          # Single-page composition

  LanguagePill.tsx                    Inline language pill  globals.css       # Tailwind base + small global utilities

  SuccessState.tsx                    Animated check + confirmationcomponents/

  Footer.tsx                          Tagline + tiny links  Wordmark.tsx      # Top "One · Read" mark

lib/  MorningIcon.tsx   # Inline SVG sunrise-over-page illustration

  options.ts                          Interests, languages, validators  SignupForm.tsx    # Email + interests + languages + submit

  prisma.ts                           PrismaClient singleton  InterestChip.tsx  # Soft, premium toggle chip

  resend.ts                           Welcome-email helper  LanguagePill.tsx  # Inline language pill

prisma/  SuccessState.tsx  # Post-submit confirmation

  schema.prisma                       Subscriber model  Footer.tsx        # Tagline + tiny links

```lib/

  options.ts        # Interests, language options, email validator

## Environment variables```



Copy `.env.example` to `.env` and fill in values.## Design notes



| Var | Used by | Notes |- **Background** — warm ivory (`#F6F1E6`) with two very faint radial glows to evoke morning light. No images, no gradients on content.

| --- | --- | --- |- **Typography** — Fraunces (serif) for the headline and italic accents, Inter (sans) for the body and form. The headline sits on a tight `-0.012em` track for editorial elegance.

| `PRISMA_DATABASE_URL` | Prisma datasource | Required. Pooled connection on Vercel Postgres / Neon. |- **Layout** — single column, max-width `36rem`, perfectly centered. Designed to fit a standard desktop viewport with very little scroll.

| `DATABASE_URL` | tooling / `@vercel/postgres` | Optional locally. |- **Accent** — a single warm "dawn" color (`#C97A2C`) used only in the sun illustration and validation hints. Selected states use the dark "ink" fill instead, keeping the page restrained.

| `POSTGRES_URL` | tooling | Optional. |- **Motion** — all entrance animations use a single `cubic-bezier(0.16, 1, 0.3, 1)` curve, staggered by ~120 ms. The sun's rays gently pulse. The success check draws on with `stroke-dashoffset`. No motion library.

| `RESEND_API_KEY` | Welcome email | If unset, signup still works — email is skipped and logged. |- **Accessibility** — semantic `fieldset`/`legend`, `role="checkbox"` chips with `aria-checked`, `role="radiogroup"` language groups, polite live region on the success state, visible focus rings via `:focus-visible`.

| `RESEND_FROM` | Welcome email "From" | Optional. Falls back to `One Read <onboarding@resend.dev>` (dev only). Set this to a verified sender on a verified domain in production. |

## Wiring a backend later

> All four were already configured on Vercel as of June 2026; you only need a `.env` locally.

The form already produces a clean payload in `SignupForm` → `onSubmitted`:

## Local development

```ts

### 1) Install dependencies (also runs `prisma generate`){

  email: string;

```bash  interests: Interest[];

npm install  sourceLanguage: "English" | "Turkish" | "Any";

```  summaryLanguage: "English" | "Turkish";

}

### 2) Generate the Prisma client (no-op if already done by postinstall)```



```bashReplace the simulated `await new Promise(...)` with a `fetch("/api/subscribe", ...)` call (Supabase, Resend, etc.) and you're done.

npx prisma generate
```

### 3) Create the database schema

For the very first run, create an initial migration and apply it:

```bash
npx prisma migrate dev --name init
```

For subsequent schema changes, use:

```bash
npx prisma migrate dev --name <descriptive_change_name>
```

If you only want to push the current schema to the DB without creating a migration file (useful for prototypes):

```bash
npx prisma db push
```

### 4) Start the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

### 5) Test the signup flow

1. Enter a valid email → click **Continue**. The row is upserted in `Subscriber` with `status = "PENDING_PREFERENCES"`.
2. Pick at least one interest, optionally adjust languages → click **Finish setup**. The row is updated with prefs and `status = "ACTIVE"`, and a welcome email is sent via Resend.
3. You should see the success state: *"You're in. Your first One Read arrives tomorrow at 7 AM."*

Inspect the database with Prisma Studio:

```bash
npm run db:studio
```

Quick API smoke tests:

```bash
curl -X POST http://localhost:3000/api/signup/start \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'

curl -X POST http://localhost:3000/api/signup/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "email":"you@example.com",
    "interests":["Artificial Intelligence","Design"],
    "sourceLanguage":"Any",
    "summaryLanguage":"English"
  }'
```

## Deploying to Vercel

The project is already configured for Vercel:

- `vercel.json` pins the framework to **Next.js** and the output to `.next`.
- `package.json#scripts.build` runs `prisma generate && next build`, so the Prisma client is always fresh in the deployed bundle.
- `package.json#scripts.postinstall` also runs `prisma generate`, so cached `node_modules` deployments still work.

### One-time database migration on the production DB

Migrations are **not** run during build (intentionally — you don't want a build to lock the DB or fail on a transient connection). Apply migrations from your machine, pointing at the production `PRISMA_DATABASE_URL`:

```bash
# From the repo root, with PRISMA_DATABASE_URL pointing at production
npx prisma migrate deploy
```

…or use the Vercel CLI to pull production env vars first:

```bash
vercel env pull .env.production.local
DATABASE_URL=$(grep PRISMA_DATABASE_URL .env.production.local | cut -d '=' -f2-) \
  npx prisma migrate deploy
```

## Design notes

- **Background** — warm ivory `#F6F1E6` with two faint radial glows to evoke morning light. No images.
- **Typography** — Fraunces (serif) for headlines, Inter (sans) for body and form. Headlines on a tight `-0.012em` track.
- **Layout** — single column, max-width `36rem`, perfectly centered. Designed to fit a desktop viewport with minimal scroll.
- **Accent** — a single warm "dawn" amber `#C97A2C` lives only in the sun illustration and the inline error hints. Selected states use the dark "ink" fill, keeping the page restrained.
- **Motion** — entrance animations use one cubic-bezier curve, staggered ~120 ms. Sun rays gently pulse. The success check draws on with `stroke-dashoffset`. No motion library.
- **Two-step flow** — Step 1 shows only the email input + Continue. After save, the headline and copy fade out and Step 2 (interests + languages) fades in. The same `Subscriber` row is updated, then a Resend welcome email is sent.
- **Accessibility** — semantic `fieldset`/`legend`, `role="checkbox"` chips with `aria-checked`, `role="radiogroup"` for languages, polite live region on submit + success, visible focus rings via `:focus-visible`.

## Status values

- `PENDING_PREFERENCES` — set after step 1.
- `ACTIVE` — set after step 2 (preferences saved). The morning job will read from this set.

## Development Demo Preview

Use this before real LLM or Resend production delivery is configured:

```bash
npm run seed:demo-articles
npm run score
npm run dry-run -- --skip-ingest --demo
npm run summarize -- --lang Turkish --twice
npm run demo:preview
```

`npm run demo:preview` seeds demo articles, scores them, creates development preview picks for demo articles, generates heuristic summaries, runs a dry-run mapping, and prints the `/admin?token=<ADMIN_TOKEN>` preview instruction.

Demo mode is development-only. `DEMO_MODE=true` or `--demo` can relax preview thresholds only when `NODE_ENV !== "production"`; production thresholds remain unchanged. Demo output is labeled as `heuristic-dev`, demo/manual, and render-only, and no real email is sent by demo preview or dry-run commands.
