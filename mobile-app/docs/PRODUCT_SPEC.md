# OneRead iOS product specification

## Product promise

OneRead iOS is the native reading companion for the weekday OneArticle email. Email remains the primary delivery channel. The application presents the same manually authored `OneArticleIssue` in a calmer, more legible native reader and adds a finite archive and a small amount of optional reading.

The product deliberately optimizes for trust, comprehension, completion, and a sustainable morning habit. A successful session is opening Today, reading one issue, optionally opening its original source, and leaving.

## Audience and access

The initial release is an existing-subscriber reader app. Email ownership is verified with the existing OneRead OTP implementation; successful verification creates a revocable mobile bearer session. Polar remains the billing source of truth. A verified non-subscriber can see account state and limited fixture/sample material, but cannot access subscriber issues.

Email delivery and paid access are separate. Pausing email, a Resend failure, or a provider suppression does not cancel an entitlement. Logging out of the app does not affect email delivery.

## Information architecture

- **Today** is the default and visually dominant destination. It contains the daily issue and at most three quiet secondary recommendations.
- **Explore** contains server-sized, finite sections. Initial server content is a small set of recent entitled OneArticle issues; no raw scraped third-party text is returned.
- **Library** is a chronological, month-grouped archive with explicit pagination. It is not ranked and never infinite-scrolls.
- **Account** is reached from the profile action, not a fourth tab. It contains shared reading preferences, optional morning notifications, legal/support links, session controls, and account deletion.

## Daily issue states

The server, using its clock, returns one explicit state:

- `ACCOUNT_INCOMPLETE`: shared OneArticle reading-language preferences are incomplete.
- `SUBSCRIPTION_REQUIRED`: no currently valid Polar/legacy/admin OneRead entitlement exists.
- `UPCOMING`: an entitled delivery exists but the issue's scheduled time has not arrived.
- `AVAILABLE`: the issue is legitimately published and its delivery is queued, sending, sent, or otherwise readable.
- `DELIVERY_FAILED_BUT_READABLE`: the legitimately published issue has a failed email delivery record.
- `READ`: the same as available, with a completed reading-state record.
- `NO_EDITION`: no eligible published/delivered issue exists for today.

`DRAFT`, `READY`, canceled, unscheduled, and future issues are never serialized to the mobile client. A delivery record is required for personalized Today and archive access, preventing cross-user issue enumeration.

## Reader

The reader uses native `Text`, `Image`, and layout primitives—not an HTML WebView. Existing `bodyText` remains the compatibility source and is converted to typed blocks server-side; a new optional `nativeContent` JSON field can carry paragraphs, headings, quotes, callouts, dividers, images, and source notes for future issues.

The reader has a narrow measure, editorial Fraunces headings, readable Inter body text, selectable copy, progress that updates only at meaningful thresholds, clear attribution, a system-browser source action, and a distinct completion boundary. It supports Dynamic Type, VoiceOver, dark mode, Reduce Motion, and offline access to today's or recently opened cached issues.

## Explicit non-goals

There is no infinite feed, social graph, comments, likes, streaks, badges, AI assistant, on-device scraping, autoplay, advertising, or in-app purchase in the initial implementation. Saving/bookmarking is deferred until it has a clear product need. OneFilm, OneLingo, and other retired products remain inaccessible.

## Success and quality criteria

- Today's issue is the unquestioned visual focus.
- Every content collection has a visible end.
- A subscriber can safely use email, web, and iOS without conflicting state.
- The app remains useful offline without claiming stale content is current.
- The smallest supported iPhone and accessibility text sizes remain operable.
- No credential, OTP, bearer token, email address, full article body, or private editorial field is emitted to analytics/error context.
