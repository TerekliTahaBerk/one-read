# App Store and TestFlight checklist

## Apple Developer

- [ ] Register `email.oneread.ios` (preview/development suffix IDs are separate).
- [ ] Enable Push Notifications and Associated Domains.
- [ ] Add `applinks:www.oneread.email`; publish and validate the AASA file.
- [ ] Confirm deployment target (Expo SDK 57 requires iOS 16.4+) and current Xcode/App Store requirements.

## App Store Connect

- [ ] Create the OneRead app record; primary category News or Magazines & Newspapers after product review.
- [ ] Set app name, subtitle, description, keywords, age rating, support URL, privacy URL, and marketing URL.
- [ ] Upload the final 1024px icon and required current-device screenshots (Today, reader, Explore, Library, settings/accessibility).
- [ ] Complete App Privacy answers for account email, product interaction, crash data, device/push identifier, and any analytics actually enabled.
- [ ] Confirm contracts/tax/banking only if Apple IAP is later enabled.

## Review preparation

- [ ] Production backend and OTP email are reachable over HTTPS.
- [ ] Provide a durable review account or review-specific OTP procedure that does not disclose a shared production secret.
- [ ] Review notes explain: one weekday article is primarily emailed; the app is an existing-subscriber native reader; Polar is existing web billing; there is no purchase CTA; external sources open in system Safari; deletion anonymizes legally retained billing records.
- [ ] Confirm the current reader-app/storefront policy with qualified ownership.
- [ ] Exercise login, expired session, active/inactive entitlement, failed email delivery but readable issue, deletion, denied notifications, offline cache, dark mode, large text, and VoiceOver.

## TestFlight

- [ ] `eas build --profile preview --platform ios`; install internally on at least small, standard, and Max devices.
- [ ] Review crashes/API schema errors in Sentry without PII.
- [ ] Run the Maestro smoke suite and manual accessibility/reader checklist.
- [ ] Collect external TestFlight feedback if used; resolve launch-blocking issues.
- [ ] Build production, inspect the archive, then submit manually. No automated submission is configured.
