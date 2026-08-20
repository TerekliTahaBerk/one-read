# Production route inventory

The production product is OneArticle. The build manifest is authoritative and is checked by `npm run verify:routes`.

## Public pages

`/`, `/article`, `/pricing`, `/subscribe`, `/subscribe/success`, `/preferences`, `/samples/article`, `/editorial`, `/blog`, `/blog/[slug]`, `/terms`, `/privacy`, `/unsubscribe`, `/robots.txt`, `/sitemap.xml`, and metadata image/manifest routes.

`/article/pricing` and `/article/subscribe` are compatibility redirects into the single OneRead purchase flow. `/article/subscribe/success` remains a compatibility confirmation page.

## Reader APIs

- `/api/oneread/verification/request`
- `/api/oneread/verification/confirm`
- `/api/oneread/article-preferences`
- `/api/oneread/lookup`
- `/api/oneread/checkout`
- `/api/oneread/portal`
- `/api/oneread/resume-emails`
- `/api/unsubscribe`
- `/api/feedback`

## Provider and scheduled APIs

- `/api/webhook/polar`
- `/api/webhook/resend`
- `/api/cron/daily`

## Admin

`/admin`, `/admin/login`, `/admin/logout`, `/admin/users`, `/admin/users/[id]`, `/admin/analytics`, `/admin/audit`, `/admin/runs`, `/admin/settings`, and `/admin/one-article/**`, plus their authenticated OneArticle/settings/user action APIs.

## Explicitly absent

All Film, Lingo, Waitlist, legacy signup/subscribe, standalone OneArticle verification, legacy Polar checkout, retired cron, and retired product admin routes are forbidden. Mock billing routes are local/explicit-preview fixtures and cannot compile into a production deployment.

Legacy Film/Lingo Prisma tables are intentionally retained to avoid destructive data loss. No production route reads them for eligibility, checkout, dispatch, admin operations, or public rendering.
