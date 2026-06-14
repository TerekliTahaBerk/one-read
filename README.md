# One Read

> One article. Every morning. Curated for you.

A calm, editorial landing page for **One Read** — a service that delivers a single curated article summary to your inbox every morning at 7 AM, based on your interests and language preferences.

## Stack

- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS 3
- `next/font` (Fraunces serif + Inter sans)
- Inline SVG illustration — **no image assets**

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  layout.tsx        # Root layout, fonts, metadata
  page.tsx          # Single-page composition
  globals.css       # Tailwind base + small global utilities
components/
  Wordmark.tsx      # Top "One · Read" mark
  MorningIcon.tsx   # Inline SVG sunrise-over-page illustration
  SignupForm.tsx    # Email + interests + languages + submit
  InterestChip.tsx  # Soft, premium toggle chip
  LanguagePill.tsx  # Inline language pill
  SuccessState.tsx  # Post-submit confirmation
  Footer.tsx        # Tagline + tiny links
lib/
  options.ts        # Interests, language options, email validator
```

## Design notes

- **Background** — warm ivory (`#F6F1E6`) with two very faint radial glows to evoke morning light. No images, no gradients on content.
- **Typography** — Fraunces (serif) for the headline and italic accents, Inter (sans) for the body and form. The headline sits on a tight `-0.012em` track for editorial elegance.
- **Layout** — single column, max-width `36rem`, perfectly centered. Designed to fit a standard desktop viewport with very little scroll.
- **Accent** — a single warm "dawn" color (`#C97A2C`) used only in the sun illustration and validation hints. Selected states use the dark "ink" fill instead, keeping the page restrained.
- **Motion** — all entrance animations use a single `cubic-bezier(0.16, 1, 0.3, 1)` curve, staggered by ~120 ms. The sun's rays gently pulse. The success check draws on with `stroke-dashoffset`. No motion library.
- **Accessibility** — semantic `fieldset`/`legend`, `role="checkbox"` chips with `aria-checked`, `role="radiogroup"` language groups, polite live region on the success state, visible focus rings via `:focus-visible`.

## Wiring a backend later

The form already produces a clean payload in `SignupForm` → `onSubmitted`:

```ts
{
  email: string;
  interests: Interest[];
  sourceLanguage: "English" | "Turkish" | "Any";
  summaryLanguage: "English" | "Turkish";
}
```

Replace the simulated `await new Promise(...)` with a `fetch("/api/subscribe", ...)` call (Supabase, Resend, etc.) and you're done.
