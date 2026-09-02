# Mobile authentication and threat review

## Session design

OTP request/confirmation delegates to the existing HMAC-based OneRead verification core, preserving expiry, attempt limits, cooldown, IP/email rate limits, and one-time consumption. Verification proves email ownership; it does not grant paid access.

A successful OTP creates `ors_1.<selector>.<32-byte-secret>`. The selector supports one indexed lookup. The complete token is HMAC-SHA-256 hashed with `MOBILE_SESSION_SECRET`; only the hash is stored. Comparison is timing-safe. Sessions default to 90 days, fail closed after expiry/revocation, and throttle `lastUsedAt` writes. The device stores the raw token only in Keychain-backed SecureStore.

## Review findings

- **Critical:** none found.
- **High (dependency advisory):** `npm audit --omit=dev` reports unpatched denial-of-service advisories in `image-size`, reached through Expo/Metro build tooling. The vulnerable parser is used while tooling inspects developer-supplied assets, not by the shipped app to parse remote article images, so the current product exposure is constrained; nevertheless there is no patched `image-size` release and the finding must be monitored rather than suppressed. `npm audit fix --force` would incorrectly downgrade Expo to SDK 53 and must not be used.
- **Medium:** production API rate limiting currently inherits database-backed OTP limits but general authenticated endpoints do not have a shared perimeter rate limiter. Configure Vercel Firewall rate limits before launch. The same audit reports an older `uuid` through Expo's Xcode configuration tooling; the affected buffer-writing APIs are not called by OneRead, but the transitive version should be updated by Expo when compatible.
- **Low:** push provider tokens are stored in PostgreSQL because dispatch requires the raw opaque token. Restrict DB access and retention; migrate to field encryption if the operational threat model expands.

Controls include per-contact issue joins (IDOR protection), published-state/timing checks, HTTPS-only source/image DTO URLs, allowlisted deep links, no arbitrary redirect endpoint, versioned DTO parsing, no secrets in app config, session/cache clearing on logout, and Sentry PII/body/header stripping.

## Required secrets

`MOBILE_SESSION_SECRET` is server-only, independent of the OTP secret, at least 32 random bytes encoded for environment storage. Never expose it as `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`. Rotate it only with an intentional all-device logout plan because rotation invalidates every mobile session.
