# OneRead iOS architecture

## System shape

The existing Next.js application remains the only backend and the only editorial/email runtime. PostgreSQL remains the shared source of truth. The isolated Expo application consumes `/api/mobile/v1/*` over HTTPS and never connects to PostgreSQL, Resend, Polar, or APNs with server credentials.

```
OneArticleIssue -> email renderer -> Resend
       |
       +--------> mobile DTO mapper -> versioned API -> Expo iOS app
```

## Repository isolation

`/mobile-app` owns its own `package.json`, lockfile, TypeScript configuration, lint/test configuration, Expo config, and EAS profiles. The root is not converted into a workspace. This prevents React 18/Next.js dependencies from being hoisted into the Expo SDK 57 / React 19.2 / React Native 0.86 graph. Root build discovery is unchanged.

## Mobile application

- Expo Router owns navigation and validated internal deep links.
- TanStack Query owns remote state and request retry/caching.
- SecureStore stores only the raw mobile bearer token.
- AsyncStorage stores versioned, non-secret article DTO caches and small UI preferences.
- A narrow auth provider coordinates SecureStore and query invalidation; no general-purpose global store is added.
- `src/design` contains semantic light/dark tokens and accessible primitives.
- Feature modules own screens, DTO adapters, and local behavior rather than building monolithic route files.

SDK 57 is stable and targets React Native 0.86 and React 19.2.3. The project requires Node 22.13 or newer for SDK tooling.

## Mobile authentication

The request-code endpoint delegates to the existing OneRead verification core and keeps its generic anti-enumeration response/rate limits. Verification consumes the same one-time code and then creates a `MobileSession` in a transaction:

1. Generate 32 random bytes with Node crypto.
2. Return a versioned token containing a random public selector and secret.
3. Persist only an HMAC-SHA-256 hash of the complete token, never plaintext.
4. Store the token in iOS Keychain through SecureStore.
5. Authenticate with `Authorization: Bearer` and a timing-safe hash comparison.

Sessions expire, update `lastUsedAt` at a throttled interval, can be individually revoked at logout, and are all revoked during account deletion. Authentication errors use a stable response envelope and never log credentials.

## Data and content

Additive models are `MobileSession`, `PushDevice`, and `ReadingState`; `OneArticleIssue.nativeContent` is additive and optional. Existing email fields and rendering remain unchanged.

Mobile DTOs whitelist public fields. They omit admin notes, provider identifiers, delivery errors, internal scores, scraped `cleanedText`, raw email HTML, and audit metadata. Issue access always joins the authenticated contact's delivery. The app cannot fetch another contact's issue by guessing an ID.

## Today resolution

`resolveTodayForContact(contactId, now)` first loads shared preferences and provider-confirmed access independently of email opt-in. It then searches only the contact's `OneArticleDelivery` records and issues in safe published states. `scheduledFor <= now` is required. Failed Resend delivery maps to `DELIVERY_FAILED_BUT_READABLE`; it does not hide a valid issue. Future and draft material fail closed.

The editorial timezone is used to determine the issue day; the server clock is authoritative. The client date is presentation-only.

## Offline and privacy

Successful issue reads are cached as a bounded versioned DTO set. Cache content is editorial, not authentication material. Logout/account deletion clears query and article caches plus SecureStore. Offline UI labels cached dates and never synthesizes availability.

Push registration is contextual and optional. Push tokens are treated as sensitive operational identifiers, are never returned after registration, and are revoked on logout when possible. A daily ready notification deep-links only to a fixed allowlisted route.

## Operations

The root web release gates remain unchanged. Mobile CI runs from `mobile-app` and does not require Apple, Expo, Sentry, Resend, Polar, or database credentials. EAS profiles separate development, preview, and production. Runtime behavior is configured by public API origin and environment labels; secrets remain in provider stores.
