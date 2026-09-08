import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { resolveThresholds } from "./pipeline";

const PANEL = {
  minArticleScore: 0.42,
  minDeliveryScore: 0.33,
  minSummaryConfidence: 51,
};

beforeEach(() => {
  // Demo mode is env-driven; an inherited value would silently relax the bars.
  vi.stubEnv("DEMO_MODE", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveThresholds", () => {
  it("uses the env constants when the panel is unreadable", () => {
    const thresholds = resolveThresholds({}, null);
    expect(thresholds).toMatchObject({
      minArticleScore: 0.7,
      minDeliveryScore: 0.6,
      minSummaryConfidence: 75,
      demo: false,
    });
  });

  it("applies the panel quality bars to a normal run", () => {
    expect(resolveThresholds({}, PANEL)).toMatchObject({ ...PANEL, demo: false });
  });

  it("lets an explicit caller override the panel", () => {
    const thresholds = resolveThresholds({ thresholds: { ...PANEL, minArticleScore: 0.95 } }, PANEL);
    expect(thresholds.minArticleScore).toBe(0.95);
  });

  it("keeps demo mode relaxed rather than letting a panel value raise the bar", () => {
    vi.stubEnv("NODE_ENV", "development");
    const thresholds = resolveThresholds({ demo: true }, { ...PANEL, minArticleScore: 0.99 });
    expect(thresholds.demo).toBe(true);
    expect(thresholds.minArticleScore).toBe(0.45);
  });

  it("ignores demo mode in production and still applies the panel bars", () => {
    vi.stubEnv("NODE_ENV", "production");
    const thresholds = resolveThresholds({ demo: true }, PANEL);
    expect(thresholds.demo).toBe(false);
    expect(thresholds.minArticleScore).toBe(PANEL.minArticleScore);
  });
});
