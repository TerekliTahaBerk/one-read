/**
 * The permanent Phase 1 money-flow gate.
 *
 * Phase 1 built the billing contracts one task at a time, and each task left
 * its own tests behind. That is enough to prove the contracts today and not
 * enough to keep them proven: a case can quietly lose its only covering test in
 * a refactor, and nothing fails.
 *
 * This file is the single place the required matrix is written down. Every case
 * from the P1.6 contract names the layers that must cover it and the tests that
 * do, and this suite reads those files to confirm the tests are still there. It
 * asserts nothing about billing behaviour itself — the named tests do that. What
 * it makes impossible is deleting or renaming the last test for a case without
 * a deliberate edit here.
 *
 * Adding a case: add the entry, then write the test. Removing coverage: the
 * entry must go too, and that is a reviewable decision rather than a silent one.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OFFER_KEYS } from "@/lib/products/registry";

const ROOT = join(__dirname, "..");

/** The four layers P1.6 requires the matrix to be proven at. */
type Layer = "unit" | "integration" | "e2e";

interface Coverage {
  /** Repo-relative test file. */
  file: string;
  /** An exact `it(...)` / `test(...)` title fragment inside that file. */
  title: string;
  layer: Layer;
}

interface MatrixCase {
  /** The case as the P1.6 contract names it. */
  case: string;
  /** Layers this case must be proven at, beyond whatever else covers it. */
  requires: readonly Layer[];
  covered: readonly Coverage[];
}

const HAPPY_PATH: readonly MatrixCase[] = OFFER_KEYS.map((offer) => ({
  case: `happy purchase path — ${offer}`,
  requires: ["unit", "integration", "e2e"] as const,
  covered: [
    {
      layer: "unit" as const,
      file: "lib/billing/polar-webhook-matrix.test.ts",
      title: "activation records offer identity, interval and ACTIVE_PAID",
    },
    {
      layer: "integration" as const,
      file: "test/integration/money-flow.test.ts",
      title: "selection → verification → checkout → signed webhook → entitlement",
    },
    {
      layer: "e2e" as const,
      file: "e2e/critical-flows.spec.ts",
      title: "signup is annual-first and sends a semantic checkout request",
    },
  ],
}));

const NEGATIVE_AND_LIFECYCLE: readonly MatrixCase[] = [
  {
    case: "invalid verification",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "lib/verification/core.test.ts",
        title: "charges a wrong guess against the attempt budget atomically",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "an invalid code costs an attempt and never verifies",
      },
    ],
  },
  {
    case: "expired verification",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "lib/verification/core.test.ts",
        title: "refuses an expired code without consuming it",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "an expired code is refused without being consumed",
      },
    ],
  },
  {
    case: "replayed verification",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "lib/verification/core.test.ts",
        title: "refuses an already-consumed code, which is never re-read",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "a replayed verification code is refused — the code is single-use",
      },
    ],
  },
  {
    case: "checkout abandonment",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "lib/billing/offer-checkout.test.ts",
        title: "resumes the open session instead of opening a second one",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "an abandoned checkout leaves the row pending and grants nothing",
      },
    ],
  },
  {
    case: "unknown offer",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "lib/products/registry.test.ts",
        title: "rejects unknown offers, unknown intervals and non-strings",
      },
      {
        layer: "unit",
        file: "app/api/billing/checkout/route.test.ts",
        title: "reports an unknown offer as a bad request, not an intent mismatch",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "an unknown offer never reaches a provider product",
      },
    ],
  },
  {
    case: "invalid webhook signature",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "app/api/webhook/polar/route.test.ts",
        title: "returns 403 when signature verification fails",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "an invalid signature is refused and writes nothing at all",
      },
    ],
  },
  {
    case: "duplicate webhook",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "lib/billing/polar-webhook-matrix.test.ts",
        title: "a redelivered identical event applies the same state (idempotent)",
      },
      {
        layer: "unit",
        file: "app/api/webhook/polar/route.test.ts",
        title: "returns 200 duplicate:true and skips processing on a duplicate providerEventId",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "a redelivered event is acknowledged once and applied once",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "a retry re-signed under a new delivery id settles on the same state",
      },
    ],
  },
  {
    case: "stale / out-of-order webhook",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "lib/billing/polar-webhook-matrix.test.ts",
        title: "a stale event cannot regress newer billing state",
      },
      {
        layer: "unit",
        file: "lib/billing/polar-webhook-matrix.test.ts",
        title: "events arriving out of order settle on the newest, whichever lands last",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "a stale, out-of-order event cannot regress billing state",
      },
    ],
  },
  {
    case: "unknown provider product",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "lib/billing/polar-webhook-matrix.test.ts",
        title: "an unknown provider product is never applied and never assumed to be the bundle",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "an unknown provider product is recorded and never granted",
      },
    ],
  },
  {
    case: "missing correlation",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "lib/billing/reconciliation.test.ts",
        title: "flags a paid row with no provider correlation id as critical",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "an event with no correlation to any row is recorded as no_subscription",
      },
    ],
  },
  {
    case: "active → cancel-at-period-end → expired",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "lib/products/entitlement-matrix.test.ts",
        title: "cancel-at-period-end keeps access until the provider period actually ends",
      },
      {
        layer: "unit",
        file: "lib/billing/polar-webhook-matrix.test.ts",
        title: "cancellation is recorded as CANCELED with the period end intact",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "active → cancel-at-period-end → expired after the paid period",
      },
    ],
  },
  {
    case: "past_due → recovered active",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "lib/billing/polar-webhook-matrix.test.ts",
        title: "recovering from past due clears the grace anchor",
      },
      {
        layer: "unit",
        file: "lib/billing/lifecycle.test.ts",
        title: "grace ends exactly PAST_DUE_GRACE_DAYS after the failure",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "past_due → recovered active, with the grace anchor cleared",
      },
    ],
  },
  {
    case: "cancellation / revocation / refund contract",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "lib/billing/polar-webhook-matrix.test.ts",
        title: "revocation expires access outright",
      },
      {
        layer: "unit",
        file: "lib/billing/polar-webhook-matrix.test.ts",
        title: "a refunded order never reads as a payment",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "revocation expires access outright, and resubscribing restores it",
      },
    ],
  },
  {
    case: "resubscribe / reactivation",
    requires: ["unit", "integration"],
    covered: [
      {
        layer: "unit",
        file: "lib/billing/polar-webhook-matrix.test.ts",
        title: "resubscribing after expiry activates the row again",
      },
      {
        layer: "unit",
        file: "lib/billing/polar-webhook-matrix.test.ts",
        title: "uncancelling clears the pending end and restores a plain active subscription",
      },
      {
        layer: "integration",
        file: "test/integration/money-flow.test.ts",
        title: "revocation expires access outright, and resubscribing restores it",
      },
    ],
  },
];

export const MONEY_FLOW_MATRIX: readonly MatrixCase[] = [
  ...HAPPY_PATH,
  ...NEGATIVE_AND_LIFECYCLE,
];

const fileCache = new Map<string, string>();
function sourceOf(file: string): string {
  const cached = fileCache.get(file);
  if (cached !== undefined) return cached;
  const contents = readFileSync(join(ROOT, file), "utf8");
  fileCache.set(file, contents);
  return contents;
}

/**
 * Whether `title` is the title of a test in `file`.
 *
 * Matched against the `it(` / `test(` call rather than the raw file text, so a
 * fragment that only appears in a comment — or in a `describe` that no longer
 * has the test under it — does not count as coverage.
 */
function declaresTest(file: string, title: string): boolean {
  const source = sourceOf(file);
  const pattern = /\b(?:it|test)(?:\.\w+)*\(\s*(`|"|')((?:\\.|(?!\1)[\s\S])*?)\1/g;
  for (const match of source.matchAll(pattern)) {
    if (match[2]!.includes(title)) return true;
  }
  return false;
}

describe("the P1.6 money-flow matrix is fully owned", () => {
  it.each(MONEY_FLOW_MATRIX.map((entry) => [entry.case, entry] as const))(
    "%s",
    (_name, entry) => {
      for (const coverage of entry.covered) {
        expect(
          declaresTest(coverage.file, coverage.title),
          `${entry.case}: ${coverage.file} no longer declares a test titled "${coverage.title}"`,
        ).toBe(true);
      }

      const layers = new Set(entry.covered.map((coverage) => coverage.layer));
      for (const required of entry.requires) {
        expect(
          layers.has(required),
          `${entry.case}: no ${required} coverage is claimed`,
        ).toBe(true);
      }
    },
  );

  it("covers every launch offer's happy purchase path", () => {
    for (const offer of OFFER_KEYS) {
      expect(
        MONEY_FLOW_MATRIX.some((entry) => entry.case === `happy purchase path — ${offer}`),
        `no happy purchase path is claimed for ${offer}`,
      ).toBe(true);
    }
  });

  it("names every mandatory negative and lifecycle case exactly once", () => {
    // The list the P1.6 contract requires, restated so a case cannot be dropped
    // from the matrix above without this failing.
    const mandatory = [
      "invalid verification",
      "expired verification",
      "replayed verification",
      "checkout abandonment",
      "unknown offer",
      "invalid webhook signature",
      "duplicate webhook",
      "stale / out-of-order webhook",
      "unknown provider product",
      "missing correlation",
      "active → cancel-at-period-end → expired",
      "past_due → recovered active",
      "cancellation / revocation / refund contract",
      "resubscribe / reactivation",
    ];

    const named = MONEY_FLOW_MATRIX.map((entry) => entry.case);
    expect(new Set(named).size, "a case is listed twice").toBe(named.length);
    for (const required of mandatory) {
      expect(named, `"${required}" is missing from the matrix`).toContain(required);
    }
  });

  it("proves the matcher rejects a title that is not there", () => {
    // Guards the gate itself: a matcher that always passed would make every
    // assertion above vacuous.
    expect(
      declaresTest("test/integration/money-flow.test.ts", "a test that does not exist"),
    ).toBe(false);
    expect(
      declaresTest(
        "test/integration/money-flow.test.ts",
        "selection → verification → checkout → signed webhook → entitlement",
      ),
    ).toBe(true);
  });
});
