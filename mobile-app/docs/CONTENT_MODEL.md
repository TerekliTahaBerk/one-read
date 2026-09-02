# Native content model

`OneArticleIssue` remains the single editorial object for email and iOS. Existing `bodyText` and `bodyHtml` are untouched. The additive nullable `nativeContent` JSON field may contain this discriminated block array:

- `paragraph { text }`
- `heading { text }`
- `quote { text, attribution? }`
- `callout { title?, text }`
- `divider`
- `image { https url, alt, credit? }`
- `sourceNote { text }`

The server validates/whitelists blocks before serialization. When `nativeContent` is absent or invalid, non-empty `bodyText` paragraphs become native paragraph blocks. Email continues to render from its existing fields and does not depend on mobile code.

Third-party items must only expose title, source, HTTPS URL, short licensed/permitted metadata, and OneRead-written context. `Article.cleanedText` is never a mobile content fallback. The initial Explore implementation only returns entitled past OneArticle issues.

The OneArticle admin editor is the source of truth for mobile distribution. It controls mobile visibility, Explore visibility and priority, Listen availability, explicit topics, a mobile deck override, mastered-audio URL/duration, and the structured block array. Its live phone preview sits beside the existing email preview. Draft blocks may be incomplete while editing; readiness validation prevents publishing incomplete native blocks.

Existing rows keep `mobileEnabled`, `mobileExploreEnabled`, and `mobileListenEnabled` on by default. Empty topic arrays use the deterministic legacy classifier. Empty native block arrays use the safe paragraph fallback. Empty audio URLs use on-device narration.
