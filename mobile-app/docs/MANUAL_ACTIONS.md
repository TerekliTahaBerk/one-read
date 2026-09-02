# Manual actions

No action below was performed. Real secrets must remain in Vercel/EAS/Sentry stores, never git.

| Service | Dashboard area | Exact action/value | Why / verification | TestFlight | Launch |
|---|---|---|---|---:|---:|
| PostgreSQL/Vercel | Production database migration workflow | Restore database reachability, back up, review `20260820130000_mobile_app_foundation` and `20260821103000_mobile_content_controls`, then run `prisma migrate deploy` through the normal release path | Current configured `db.prisma.io:5432` endpoint is unreachable; after recovery `prisma migrate status` is clean and new tables/columns exist | Blocks connected build | Blocks |
| Vercel | Project → Settings → Environment Variables | Add a 32+ byte random `MOBILE_SESSION_SECRET` to Preview and Production; do not prefix it public | `/auth/verify-code` can create a session; token never appears in DB/logs | Blocks auth | Blocks |
| Vercel Firewall | Project → Firewall → Rate Limiting | Add conservative per-IP limits for `/api/mobile/v1/auth/*` and broader authenticated API limits | Burst tests return 429 without affecting normal reading | Recommended | Blocks security sign-off |
| Expo/EAS | expo.dev → Project settings | Create/link project; place project UUID in `EAS_PROJECT_ID`, owner in `EXPO_OWNER` using EAS environment variables | `eas project:info`; app config resolves project ID | Blocks | Blocks |
| Apple Developer | Certificates, Identifiers & Profiles | Register `email.oneread.ios`; enable Push Notifications + Associated Domains; let EAS create/attach signing credentials | Development build installs and entitlements contain both capabilities | Blocks | Blocks |
| APNs/Expo | Apple Keys and Expo Credentials | Create or attach an APNs key to the EAS project | Physical-device test token receives one test notification | Does not block reader-only beta if push hidden | Blocks advertised push |
| DNS/Vercel | `www.oneread.email/.well-known/apple-app-site-association` | Publish AASA for team ID + `email.oneread.ios`, content type JSON, no redirect | Apple CDN/AASA validator and physical universal link test pass | No | Blocks universal links |
| Sentry | Projects → Create Project → React Native | Create `oneread-ios`; set public DSN as `EXPO_PUBLIC_SENTRY_DSN`; EAS-only org/project/auth token for source maps | Preview exception has symbolicated release/environment and no email/token/body | Recommended | Blocks observability sign-off |
| Resend | Domains + API Keys | Confirm verified OneRead sender and production OTP delivery; no mobile-specific sender is needed | App-requested code arrives; logs contain no code in production | Blocks login | Blocks |
| App Store Connect | Apps → New App | Create OneRead record for the production bundle ID and complete metadata/privacy/review fields from checklist | App record accepts production build | No | Blocks |
| Product/legal | App Review policy + Privacy/Terms review | Confirm existing-subscriber reader strategy/storefront rules; update legal copy for sessions, push tokens, crash data, local cache, and deletion retention | Qualified approval recorded; web and app claims match | Recommended | Blocks |
| Editorial/admin | OneArticle issue editor | Train editors on channel visibility, topics, Explore priority, Listen audio and structured blocks | Email and live mobile previews show the same DB-backed issue correctly | No | No |
| Push operations | Vercel scheduled job/editorial send hook | After credentials, implement one idempotent push dispatch after publication; revoke permanent receipt failures | Email timing remains independent; one device gets at most one push/issue | No | Blocks advertised push |
| Expo/dependencies | Expo SDK changelog + Dependabot | Monitor the unpatched `image-size` Metro/build-tool advisories and Expo's transitive `uuid`; upgrade through an Expo-supported release, never a forced SDK downgrade | `npm audit --omit=dev` no longer reports the advisories and Expo Doctor remains 21/21 | No | Security-owner decision |

Apple IAP is not configured. If the billing strategy changes, App Store Connect subscriptions, StoreKit code, server verification, notification endpoints, restore behavior, and double-payment prevention are all new blocking work—not dashboard-only toggles.
