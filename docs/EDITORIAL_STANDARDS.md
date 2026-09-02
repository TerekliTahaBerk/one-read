# OneRead editorial standards

Internal standards for the people who produce OneRead editions. The public
summary lives at `/editorial` (`components/EditorialStandardsContent.tsx`);
this document is the working version engineering and editorial share.

OneRead is an independent editorial project. Every edition is prepared,
reviewed and explicitly scheduled by a human editor.

---

## OneArticle

One useful idea, drawn from an identifiable source, with enough evidence for a
reader to go back to the original. See `/editorial` for the published version of
these standards; the implementation lives in `lib/one-article/`.

---

## OneNews

### The promise

**One story worth understanding.** One important story, carefully selected,
sourced, explained and edited by a human.

OneNews is *not* a feed, a top-ten list, a breaking-news alert service,
personalized political news, an automated daily summary, an AI newsroom, or a
replacement for primary sources. The internet has too much. We pick one.

### Selection

A human editor chooses the story. There is no scoring model, no ranking
pipeline and no automated selection step. The editor asks:

- Does a reasonable person's understanding of the world change if they read it?
- Can it be sourced, not just repeated?
- Is there something concrete to say about what happens next?

Volume is never a reason to publish. If nothing merits an edition, none is sent.

### Structure

| Section | Required | Contains |
| --- | --- | --- |
| Headline | yes | Clear, specific, not clickbait |
| Dek | yes | One sentence: what changed, why it deserves attention |
| What happened | yes | Verified facts. What is known, what occurred. No speculative filler |
| Why it matters | yes | Context and consequence |
| What's contested | **no** | Only when a real, material disagreement exists |
| What to watch | yes | What could materially change next, bounded |
| Sources & notes | yes | Transparent links to the evidence |
| Closing | yes | *That's enough news for today.* |

Target length is roughly 500–800 words, about 3–5 minutes. This is guidance.
The validator warns outside that band and never blocks on it. Do not pad a
story to reach a word count.

### Sourcing

- At least **two** sources, and they must be genuinely independent — two links
  from the same publication or the same host count as one voice.
- A **primary source** whenever one realistically exists: legislation, a court
  ruling, a government or regulator document, official statistics, a company
  filing, a research paper, a transcript, a direct official statement.
- A materially contested story normally carries **three** or more.

Software counts sources and checks that links are safe. It does not and will
not score whether a publication is credible. That judgment is the editor's, and
naming it as software would be a lie about what the system knows.

Cite only what you actually opened. A source you have not read is not a source.

### Developing stories

OneNews is not a breaking-news product, but some stories are still moving. When
one is, the editor marks it developing, which makes an exact `asOf` timestamp
mandatory. The email then carries a visible notice and the precise date and
time the facts were last checked — never "as of today". `asOf` is never
advanced automatically; only a human updates it.

Distinguish, in the prose:

- what is **confirmed**,
- what is **reported but unconfirmed** (attribute it),
- what is **interpretation** (mark it as such),
- what is **not yet known** (say so).

### Contested and political stories

OneNews may cover politics and contested public issues. When it does:

- Source factual claims.
- Attribute characterizations to whoever made them.
- Minimize loaded language.
- Keep factual reporting separate from interpretation.
- State uncertainty plainly.
- Include a materially relevant competing interpretation where one exists.

And explicitly do **not**:

- Force false equivalence. "What's contested" is optional; an invented second
  side is worse than no section at all.
- Profile subscribers politically or personalize ideological framing. The
  product has no political preference fields, no leaning scores and no
  per-reader framing, and adding them is out of scope by design.
- Score bias or balance automatically. No software can do this honestly.

`What's contested` is the section this discipline lives in. Leave it out when
there is no real dispute. When it is present, name the actual disagreement and
support the contested claims with sources.

### Corrections

Two kinds:

- **Minor** — a typo, formatting, a non-substantive clarification. Recorded; it
  does not change the edition's version.
- **Material** — an incorrect factual statement, materially misleading framing,
  a source correction, or an update that changes the conclusion. Recorded,
  increments the edition version, and flags that a correction email should be
  considered.

Every correction is an append-only record carrying who made it, when, the
versions it spans, and a note explaining what changed. Correction records are
never rewritten or deleted, so a material change cannot be made to disappear.
Whether a correction email actually goes out is an explicit operator decision;
it is never automatic.

### How AI is used

Be precise about this — do not overclaim, in either direction.

AI **may assist an editor** with:

- finding candidate primary sources,
- deduplicating sources,
- extracting a timeline,
- answering editorial questions,
- claim/source QA,
- translation QA,
- suggesting headline alternatives.

AI **must not**:

- select the story,
- decide political framing,
- generate final copy that is published without human review,
- fabricate sources, or cite a source nobody opened,
- invent "the other side",
- mark an edition ready, schedule it, or send it,
- publish a correction.

The human editor chooses the story, writes or reviews the copy, approves it and
schedules it. That boundary is enforced in code, not only in policy: see
`assertHumanEditor` in `lib/one-news/editorial.ts`.
