# Mobile API v1 contract

Base path: `/api/mobile/v1`. Authenticated requests send `Authorization: Bearer <token>`. Dates are ISO-8601 UTC strings. Successful responses use `{ ok: true, data, meta: { apiVersion: 1 } }`; failures use `{ ok: false, error: { code, message }, meta }`.

## Authentication

- `POST /auth/request-code` — `{ email }`; generic response, even for malformed/unknown email, plus cooldown.
- `POST /auth/verify-code` — `{ email, code, deviceLabel? }`; returns the raw session token once and its expiry.
- `POST /auth/logout` — revokes only the presented session.
- `GET /me` — returns email, coarse access state, and shared public preferences. No provider IDs.

## Reading

- `GET /home` — Today state plus a bounded secondary list (currently empty; Explore owns optional reading).
- `GET /today` — explicit state, server time, and zero or one issue.
- `GET /issues/:id` — issue only when a delivery joins it to the authenticated contact and it is published.
- `PATCH /issues/:id` — `{ progress: 0..100 }`; 92% marks completion. Clients write thresholds, not pixels.
- `GET /explore` — at most four finite server-owned sections with at most four items each.
- `GET /library?page=N` — chronological pages of 20, with `hasMore`; UI uses explicit pagination.

## Account

- `GET|PUT /preferences` — shared interests, source language, and reading language; `PUT` reuses the email preference engine.
- `POST /push/register` — iOS Expo token and valid IANA timezone.
- `POST /push/unregister` — revokes the authenticated contact's matching token.
- `POST /account/delete` — requires `{ confirmation: "DELETE" }`, anonymizes retained billing rows and removes mobile/editorial personal state.

Error codes are `INVALID_REQUEST`, `UNAUTHENTICATED`, `NOT_FOUND`, `SUBSCRIPTION_REQUIRED`, `ACCOUNT_INCOMPLETE`, `RATE_LIMITED`, and `TEMPORARILY_UNAVAILABLE`. Internal errors, delivery failure reasons, raw HTML, admin metadata, scraped full text, billing identifiers, and provider message IDs never appear in DTOs.

Each serialized issue includes panel-owned `topics` and `listen { enabled, audioUrl, durationSeconds }`. `mobileEnabled=false` removes it from every native issue query. `mobileExploreEnabled=false` keeps it out of Explore, while `mobilePriority` orders the finite shelf. The Listen client plays a validated HTTPS mastered file when supplied and otherwise uses device narration.
