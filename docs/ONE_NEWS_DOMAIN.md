# OneNews domain

Developer and operator reference for the OneNews editorial domain. Editorial
policy lives in [EDITORIAL_STANDARDS.md](EDITORIAL_STANDARDS.md).

**Scope:** this milestone (C3) builds the editorial domain and the renderer.
There is no OneNews delivery: no dispatcher, no recipient resolver, no Resend
call, no cron, no `OneNewsDelivery` table. `scheduledFor` can be set and
validated, and nothing reads it.

---

## Data model

Three additive tables. OneArticle is untouched — `OneArticleIssue` keeps its
own model and semantics, and no generic `Edition` abstraction was introduced.

### `OneNewsIssue`

One edition. Editorial fields map one-to-one to the sections a reader sees:
`headline`, `dek`, `whatHappened`, `whyItMatters`, `whatsContested` (nullable),
`whatToWatch`. Plus `subject` / `previewText` for the inbox, `readingLanguage`,
`timezone`, `status`, `scheduledFor`, `developing` / `asOf`, `adminNotes`,
`createdBy` / `updatedBy` / `version`, and the lifecycle timestamps
(`readyAt`, `scheduledAt`, `sentAt`, `canceledAt`, `claimedAt`).

`version` is an optimistic-concurrency counter: every content edit increments
it, and an update carrying a stale version fails with `version_conflict`.

Indexes: `(status, scheduledFor)`, `(readingLanguage, status)`, `(createdAt)`.

### `OneNewsSource`

Evidence for one edition, cascading from it: `url`, `title`, `publication`,
`sourceType`, `publishedAt`, `accessedAt`, `note`, `sortOrder`.

`sourceType` is one of `PRIMARY | REPORTING | ANALYSIS | RESEARCH | DATA |
OTHER` and is the *only* record of whether a source is primary — there is no
second boolean that could contradict it. Sources belong to the issue; this is
not a reusable source library or a CMS.

Index: `(issueId, sortOrder)`.

### `OneNewsCorrection`

Append-only: `type` (`MINOR | MATERIAL`), `note`, `versionBefore`,
`versionAfter`, `createdBy`, `createdAt`, plus the operator's correction-email
fields (`correctionEmailRecommended`, `correctionEmailDecision`,
`correctionEmailDecidedAt/By`). Content fields are never rewritten; only the
email decision moves.

Index: `(issueId, createdAt)`.

Migration: `20260902160000_one_news_editorial`. Strictly additive — three
`CREATE TABLE`s, their indexes and foreign keys. It does not resurrect the
tables dropped by `20260703070741_remove_one_news`; those names are gone and
these are new models.

---

## Status lifecycle

`lib/one-news/lifecycle.ts`. The vocabulary matches OneArticle so operators
read one set of words, but the state machine is OneNews's own.

```
DRAFT ⇄ READY → SCHEDULED
  ↑       ↓         ↓
  └───────┴─────────┘   (SCHEDULED → DRAFT/READY while nothing is dispatched)

DRAFT / READY / SCHEDULED → CANCELED → DRAFT
```

`SENDING`, `SENT`, `PARTIALLY_FAILED` and `FAILED` exist in the vocabulary and
in `DELIVERY_TRANSITIONS` so C4 has a contract to implement against.
`canTransition` refuses every one of them, so nothing in this milestone can put
an edition into a delivery state. Invalid transitions throw
`invalid_status_transition` rather than silently doing nothing.

Content is editable in `DRAFT` and `READY` only. A row with `claimedAt` set is
treated as dispatching and cannot be pulled back.

### The human approval gate

`READY` is never inferred. `setOneNewsIssueReady` requires **both**:

1. a named human actor — `assertHumanEditor` rejects empty labels and anything
   starting `system`, `cron`, `job`, `worker`, `bot`, `ai`, `assistant`,
   `automation`, `llm`, `gemini`, `claude`, `openai`; and
2. a clean validation pass.

Non-empty fields alone are not enough. The same guard applies to scheduling,
cancelling, editing and recording corrections. The API route layer separately
requires an authenticated admin session — the actor check is the second lock,
not the first.

---

## Validation

`lib/one-news/validation.ts`. `validateOneNewsIssue(issue, sources, now?)`
returns a structured result, never a bare boolean:

```ts
{ valid, errors, warnings, wordCount, readingMinutes,
  sourceCount, independentSourceCount, hasPrimarySource, hasContestedSection }
```

### Errors — block READY

| Code | Meaning |
| --- | --- |
| `invalid_reading_language` | Not one of the five supported languages |
| `subject_required` / `headline_required` / `dek_required` | Empty |
| `what_happened_required` / `why_it_matters_required` / `what_to_watch_required` | Empty required section |
| `whats_contested_too_short` | Section present but names no actual dispute |
| `subject_too_long`, `preview_text_too_long`, `headline_too_long`, `dek_too_long` | Over the field limit |
| `developing_requires_as_of` | Marked developing with no `asOf` |
| `invalid_as_of`, `as_of_in_future` | `asOf` is unusable |
| `insufficient_sources` | Fewer than 2 sources |
| `insufficient_independent_sources` | Sources trace back to one voice |
| `unsafe_source_url` | Not an ordinary `http(s)` link, or malformed |
| `source_title_required`, `source_publication_required`, `invalid_source_type` | Source metadata missing or unknown |

### Warnings — never block

`no_primary_source`, `few_independent_sources`, `contested_story_undersourced`,
`source_metadata_incomplete`, `as_of_stale`, `below_target_length`,
`above_target_length`, `dek_multi_sentence`.

### Draft vs. ready

`validateOneNewsDraft` applies only the subset in
`ONE_NEWS_DRAFT_BLOCKING_CODES` — language, field limits, `asOf` sanity and
link safety. An editor can always save an unfinished draft; they cannot save an
unsafe link into one.

### Source independence

Two sources count as one voice if they share a normalized publication name *or*
a host (`www.` stripped, lowercased). The independent count is therefore
`min(distinct publications, distinct hosts)`.

### What validation deliberately does not do

No credibility scoring, no bias or balance scoring, no "other side required"
rule, no political classification of any kind. Word count is guidance and emits
a warning only.

---

## As-of behavior

`developing = true` makes `asOf` mandatory. The renderer then shows a visible
developing notice plus the exact localized date **and** time with the zone
named, backed by a machine-readable `<time datetime="…">` carrying the ISO
value. Vague wording is not available. `asOf` is only ever set by a human
action; nothing advances it on its own. A non-developing edition may still
carry an `asOf`, which renders as a quiet dateline.

---

## Corrections

`recordOneNewsCorrection` appends a record to an edition that has been
approved (`readyAt` set). A note is always required; a `MATERIAL` correction
needs a substantive one (20+ characters) and increments the edition's version,
so the versions an earlier correction spans stay meaningful. Minor corrections
leave the version alone.

`correctionEmailRecommended` is advisory. `decideOneNewsCorrectionEmail`
records the operator's decision — `PENDING`, `NOT_NEEDED` or `QUEUED`.
**`QUEUED` sends nothing.** There is no correction-email delivery path in this
milestone.

---

## Render model and renderers

`buildOneNewsRenderModel(issue, sources, corrections)` in
`lib/one-news/render-model.ts` is the single mapping from stored rows to
display content. It normalizes language, labels, dates, section order, source
numbering and correction history, and it **throws `unsafe_source_url`** rather
than rendering a link it cannot vouch for.

Three consumers, one model:

- `renderOneNewsHtml` — table-based, inline conservative CSS, `<h1>`/`<h2>`
  heading hierarchy, `<ol>` for sources, a mobile breakpoint at 680px, no
  JavaScript, no feed, no related stories, no share furniture, no dark-pattern
  CTA. Meaning never depends on color alone.
- `renderOneNewsText` — written deliberately, not stripped from the HTML.
  Optional sections vanish without leaving a hole.
- The admin preview — the editor component calls the same two functions, so the
  preview is exact by construction rather than by convention.

Editorial prose passes through the shared `lib/editorial/formatting.ts` parser
(paragraphs, headings, lists, quotes, links, emphasis) which escapes everything
else. All interpolation goes through `lib/editorial/html.ts`. Arbitrary HTML
from an editorial field is escaped, never emitted.

Footer and unsubscribe: `renderOneNewsEmail(model, { unsubscribe })` takes the
link as an input and re-checks it for safety. No production token is
hard-coded; the preview passes an opaque placeholder and tests pass fake
values.

---

## Admin surface

Authenticated `/admin` only, covered by the existing `robots.txt` disallow and
absent from the sitemap and public navigation.

- `/admin/one-news` — editions list.
- `/admin/one-news/new` — create a draft.
- `/admin/one-news/issues/[id]` — edit content, manage sources, see live
  validation (errors and warnings), preview the exact HTML and plain-text
  editions, mark ready, return to draft.
- `POST /api/admin/one-news/editorial` — `create`, `update`, `sources`,
  `ready`, `draft`, `schedule`, `cancel`, `correction`, `correction-decision`.
  Every action is audit-logged under `oneNews.editorial.*`.

There is no send or test-send action, by design.

---

## Deferred

**C4 (delivery):** `OneNewsDelivery`, recipient eligibility, dispatcher, Resend
sends, retry, ambiguous-send reconciliation, provider delivery state, delivery
webhooks, cron, Better Stack heartbeat, delivery admin.

**C5 (launch):** public sample, homepage positioning, pricing CTA, multi-product
signup, My OneRead product cards, product-aware unsubscribe UI.
