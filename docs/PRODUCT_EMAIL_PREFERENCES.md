# Product email preference semantics

Billing access and email delivery are independent. A paid bundle may have OneArticle email on and OneNews email off without changing its Polar subscription.

- Browser unsubscribe GET only renders confirmation.
- Browser POST with a product subscription token disables that product only.
- The explicit “all editorial email” POST disables OneArticle and OneNews holder rows for the same contact.
- RFC 8058 POST uses the opaque subscription token and disables only the represented product mailing. It is idempotent and never changes billing.
- My OneRead may resume a voluntarily `UNSUBSCRIBED` product after email verification.
- `SUPPRESSED` rows from bounce or complaint handling cannot be resumed through customer controls.

OneNews and public checkout remain separate activation decisions. Publishing signup pages does not enable the OneNews cron.
