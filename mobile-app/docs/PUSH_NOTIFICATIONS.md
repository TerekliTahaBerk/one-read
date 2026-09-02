# Push notifications

Email remains the primary weekday delivery. Push is optional and supplemental; the only initial editorial notification is “Today’s OneArticle is ready.” Permission is requested from the Settings toggle after the reader understands the product, never on first launch.

The app obtains an Expo push token for the configured EAS project and posts it with platform and IANA timezone. `PushDevice.tokenHash` deduplicates; the raw opaque provider token is retained for dispatch and never returned by the API. Logout should unregister when network is available; account deletion removes all devices. Invalid/stale tokens must be revoked by the future dispatch job when Expo reports a permanent receipt error.

Notification data may contain only `{ "url": "oneread://today" }` or another allowlisted OneRead destination. The client rejects arbitrary hosts, query redirects, and unknown routes. Notifications use no email address, sensitive preference, or article body.

Production dispatch is not scheduled in this change: it needs APNs/EAS credentials and a deliberate hook after issue publication/delivery creation. It must send at most once per issue/device and must never delay or gate Resend email.

Test procedure: install a preview development build on a physical iPhone; enable notifications in Settings; confirm one `PushDevice`; send an Expo dashboard test with `oneread://today`; verify one quiet banner, no badge/sound by default, correct Today navigation, and no duplicate registration.
