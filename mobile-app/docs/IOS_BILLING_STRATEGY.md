# iOS billing strategy

## Initial release decision

Ship as an existing-subscriber reader. Polar remains the web entitlement source of truth and the app contains no checkout WebView, external purchase link, price comparison, or client-granted access. A non-entitled verified user can complete preferences and see restrained subscription-required copy, but cannot enumerate subscriber issues.

This is the lowest-complexity technical path, but Apple review classification and storefront rules must be confirmed against the rules in force at submission. This document is engineering analysis, not legal advice.

## Existing Polar subscription

The backend's `one-read` row contains current Polar lifecycle state. Legacy `one-article` access remains additive. Email opt-out and billing are separate axes. The mobile API checks provider-confirmed access and does not trust a client success screen.

## Apple IAP alternative

If App Review or product strategy requires in-app purchase, use StoreKit 2 auto-renewable subscriptions and a provider-neutral OneRead entitlement. Apple transactions must be verified server-side; Polar must not process Apple purchases. Required server behavior includes signed transaction verification, App Store Server Notifications v2, original-transaction ownership, renewal, grace period, billing retry, expiration, cancellation, revocation, refund, and restore purchases.

Before purchase, the backend must detect an existing Polar/Apple entitlement and clearly prevent accidental double payment. Restore must associate verified Apple ownership with the same email-verified Contact. Client receipt state alone never unlocks access.

## Storefront and management

External purchase-link eligibility, reader-app treatment, and allowed subscription-management wording differ by storefront and can change. At submission, qualified counsel/product ownership should choose the exact distribution/storefront policy. The implemented app only states that billing may be managed where purchased; it does not route to a web checkout.

IAP is intentionally deferred because no App Store Connect product identifiers, contracts, tax/banking setup, or approved product decision are available.
