# OneRead operator guide

The admin summarizes first-party state so routine operation needs no vendor
dashboard. Vercel, Sentry, Resend, Polar, and Better Stack remain the detailed
systems of record.

## Where to look

| Question | Screen |
| --- | --- |
| Is anything wrong right now? | `/admin` — health line, then Today, then System |
| Did today's edition go out? | `/admin/delivery/today` |
| What is going out next? | `/admin/delivery/upcoming` |
| What failed, and can I fix it? | `/admin/delivery/failures` |
| Why did someone stop receiving mail? | `/admin/delivery/suppressions` |
| Are people paying? | `/admin/revenue` |
| Did the cron run? | `/admin/system/health`, `/admin/runs` |
| Did billing webhooks process? | `/admin/system/webhooks` |

## Delivery terminology

OneRead tracks two independent states per recipient. The **logical send state**
is how far OneRead got (`QUEUED`, `SENDING`, `SENT`, `FAILED`, `SKIPPED`,
`RECONCILIATION_REQUIRED`). The **provider delivery state** is what Resend
reported afterwards. They are shown side by side and never merged.

- **Accepted** — Resend accepted the API request. This is *not* proof of
  mailbox delivery, and the admin never labels it "Delivered".
- **Delivered** — a signed `email.delivered` webhook was correlated to the
  delivery by provider message ID. This is the only real delivery proof.
- **Delayed** — Resend reports delivery is delayed. The outcome is still open.
- **Failed** — a known, provider-confirmed failure.
- **Bounced** — the address was rejected as undeliverable. Suppresses email.
- **Complained** — the recipient marked the mail as spam. Suppresses email.
- **Ambiguous** — OneRead cannot prove whether Resend accepted the message.
- **Suppressed** — policy prevents sending. Does **not** cancel Polar billing.
- **Unsubscribed** — the reader turned delivery off themselves.

Duplicate and reordered provider webhooks are safe. Event timestamps stop an
older event from overwriting newer state, and a terminal outcome (delivered,
failed, bounced, complained) is never downgraded by a later delay.

## Safe recovery

The rule behind every action on the failures screen: **a resend is only safe
when OneRead knows the message did not arrive.**

| Situation | Action |
| --- | --- |
| Failure below the attempt cap | Retries automatically on the next run |
| Automatic retries exhausted | Explicit operator retry on the edition screen |
| Provider-confirmed failure | Safe to retry |
| Provider delay | Wait. Resending may duplicate mail |
| Ambiguous send | Reconcile by hand. Never resend blindly |
| Bounce or complaint | Terminal by policy. Do not resend |

There is deliberately no bulk "resend everything" action anywhere in the admin.

## Suppressions and billing

Email suppression and billing are separate systems and neither changes the
other. A suppressed reader may still be paying, and a canceled subscriber may
still be subscribed to email. Bounce and complaint suppressions are not
reversible through the ordinary "resume emails" action.

## Security and privacy

Browser-session admin mutations reject cross-origin requests (`Origin` mismatch
or `Sec-Fetch-Site: cross-site` → `403`). Machine callers must authenticate with
`Authorization: Bearer …`; admin secrets are never accepted from a query string
or request body, so they cannot leak through logs or referrers. Mutations are
POST-only — no state changes through GET.

Sentry strips request bodies, cookies, authorization headers, tokens,
signatures, OTP-like fields, and email addresses from every event on browser,
server, and edge runtimes, while keeping internal IDs and product/status
context for debugging.

Product analytics (Vercel Analytics) sends only an allow-listed set of
properties — product, billing interval, reading language, campaign — and drops
any value resembling an address or opaque identifier. Billing and delivery
truth lives in the database, not in analytics.

## Testing

```bash
npm test              # unit tests
npm run test:integration   # Postgres-backed delivery tests (needs DATABASE_URL)
npm run test:e2e      # builds, then runs Playwright on desktop + mobile
```

Playwright uses deterministic network fixtures and never performs a real Polar
purchase. The mobile project uses Chromium-based phone emulation deliberately:
WebKit force-upgrades `http://127.0.0.1` to HTTPS, which blocks every script
served by the local test server.
