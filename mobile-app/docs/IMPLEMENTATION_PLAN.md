# OneRead iOS implementation plan

This plan records implementation order and acceptance evidence. Checked items must correspond to code or an executed gate; external dashboard work stays unchecked and is mirrored in `MANUAL_ACTIONS.md`.

## 1. Product shell

- [x] Isolated Expo SDK 57 / Router / strict TypeScript scaffold
- [x] Semantic light/dark design tokens and accessible primitives
- [x] Welcome, email, OTP, Today, reader, Explore, Library, Settings, preferences, and account-state screens
- [x] Realistic editorial fixtures and explicit loading/error/offline/empty states
- [x] Fraunces/Inter loading, native splash/icon configuration, safe areas, and reduced motion

## 2. Backend foundation

- [x] Additive Prisma migration for sessions, push devices, reading state, and optional native blocks
- [x] Stable response/error envelope and DTO whitelist
- [x] Shared bearer authentication and route helpers
- [x] Request/verify/logout/me routes with session expiry and revocation tests
- [x] Server-owned Today resolver with draft, timing, entitlement, and failed-delivery tests

## 3. Connected product

- [x] Today, issue detail, finite Explore, and paginated chronological Library APIs
- [x] Shared preferences read/update API with server validation
- [x] Reading progress/completion with write throttling
- [x] Contextual push registration/unregistration and allowlisted deep links
- [x] Secure account deletion with retention behavior documented
- [x] Versioned bounded offline article cache cleared on logout

## 4. Quality and release

- [x] Minimal redacted observability and meaningful product event allowlist
- [ ] Component tests and device-executed Maestro flows (contract/unit tests and the deterministic Maestro flow are committed)
- [x] Mobile lint, typecheck, tests, and Expo Doctor in CI
- [x] Existing web lint, tests, build, route guard, production audit, Prisma validation, and zero-state migration replay
- [x] Security, accessibility, reader-polish, billing, App Store, push, and manual-action documentation
- [x] EAS development, preview, and production profiles prepared without secrets

## Intentional deferrals

Apple IAP is not enabled until a storefront/legal decision is made. The initial app is an existing-subscriber reader and contains no external purchase CTA. Saved items, third-party recommendation ingestion, universal-link hosting files, and production notification dispatch are implemented only to the safe interface/configuration boundary when external ownership or credentials are required.
