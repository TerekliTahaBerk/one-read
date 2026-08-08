import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_PRODUCTION_ROUTES,
  HIDDEN_PAGE_EXTENSIONS,
  MOCK_PAGE_EXTENSIONS,
  findForbiddenRoutes,
  mockBillingSurfaceEnabled,
  oneLingoPublicPagesEnabled,
  pageExtensionsFor,
} from "./route-policy.mjs";

/**
 * The security property under test: on the production deployment there is no
 * environment variable, and no combination of them, that makes the mock billing
 * surface reachable. The mock provider writes ACTIVE_PAID with no payment, so
 * reachability there would mean forgeable paid access.
 */
describe("mockBillingSurfaceEnabled", () => {
  it("is off in production regardless of MOCK_BILLING_PREVIEW", () => {
    for (const preview of ["true", "false", "1", "TRUE", undefined]) {
      expect(
        mockBillingSurfaceEnabled({
          VERCEL_ENV: "production",
          NODE_ENV: "production",
          MOCK_BILLING_PREVIEW: preview,
        }),
      ).toBe(false);
    }
  });

  it("stays off in production even when NODE_ENV is spoofed", () => {
    // NODE_ENV is the weaker signal — it is "development" on a laptop and
    // "production" on a preview. VERCEL_ENV is the one that identifies the real
    // production deployment, so it must win outright.
    expect(
      mockBillingSurfaceEnabled({
        VERCEL_ENV: "production",
        NODE_ENV: "development",
        MOCK_BILLING_PREVIEW: "true",
      }),
    ).toBe(false);
  });

  it("is on for local development", () => {
    expect(mockBillingSurfaceEnabled({ NODE_ENV: "development" })).toBe(true);
  });

  it("is on for tests", () => {
    expect(mockBillingSurfaceEnabled({ NODE_ENV: "test" })).toBe(true);
  });

  it("is off for a plain production-mode build that did not opt in", () => {
    // `npm run build` on a laptop or in CI must produce a production-shaped
    // artifact, so the default here is off rather than on.
    expect(mockBillingSurfaceEnabled({ NODE_ENV: "production" })).toBe(false);
  });

  it("is on for a preview deployment that opts in", () => {
    expect(
      mockBillingSurfaceEnabled({
        VERCEL_ENV: "preview",
        NODE_ENV: "production",
        MOCK_BILLING_PREVIEW: "true",
      }),
    ).toBe(true);
  });

  it("is off for a preview deployment that does not opt in", () => {
    expect(
      mockBillingSurfaceEnabled({ VERCEL_ENV: "preview", NODE_ENV: "production" }),
    ).toBe(false);
  });
});

describe("oneLingoPublicPagesEnabled", () => {
  it("is off in production regardless of ONELINGO_PUBLIC_PAGES", () => {
    for (const optIn of ["true", "false", undefined]) {
      expect(
        oneLingoPublicPagesEnabled({
          VERCEL_ENV: "production",
          NODE_ENV: "production",
          ONELINGO_PUBLIC_PAGES: optIn,
        }),
      ).toBe(false);
    }
  });

  it("is on in development, so the product stays revivable", () => {
    expect(oneLingoPublicPagesEnabled({ NODE_ENV: "development" })).toBe(true);
  });

  it("is off for a plain production-mode build", () => {
    expect(oneLingoPublicPagesEnabled({ NODE_ENV: "production" })).toBe(false);
  });

  it("can be opted into on a preview deployment", () => {
    expect(
      oneLingoPublicPagesEnabled({
        VERCEL_ENV: "preview",
        NODE_ENV: "production",
        ONELINGO_PUBLIC_PAGES: "true",
      }),
    ).toBe(true);
  });
});

describe("pageExtensionsFor", () => {
  it("omits every gated extension in production, so those files are not routes", () => {
    const extensions = pageExtensionsFor({
      VERCEL_ENV: "production",
      NODE_ENV: "production",
      MOCK_BILLING_PREVIEW: "true",
      ONELINGO_PUBLIC_PAGES: "true",
    });
    for (const gated of [...MOCK_PAGE_EXTENSIONS, ...HIDDEN_PAGE_EXTENSIONS]) {
      expect(extensions).not.toContain(gated);
    }
  });

  it("includes every gated extension in development", () => {
    const extensions = pageExtensionsFor({ NODE_ENV: "development" });
    for (const gated of [...MOCK_PAGE_EXTENSIONS, ...HIDDEN_PAGE_EXTENSIONS]) {
      expect(extensions).toContain(gated);
    }
  });

  it("always keeps the real page extensions", () => {
    for (const env of [{ NODE_ENV: "development" }, { VERCEL_ENV: "production" }]) {
      expect(pageExtensionsFor(env)).toEqual(expect.arrayContaining(["tsx", "ts", "jsx", "js"]));
    }
  });
});

describe("findForbiddenRoutes", () => {
  it("catches the mock billing API routes", () => {
    const violations = findForbiddenRoutes([
      "/api/subscribe/mock/complete",
      "/api/subscribe/mock/action",
    ]);
    expect(violations.map((v) => v.route)).toEqual([
      "/api/subscribe/mock/complete",
      "/api/subscribe/mock/action",
    ]);
  });

  it("catches the mock billing pages", () => {
    const violations = findForbiddenRoutes([
      "/article/subscribe/mock-checkout",
      "/article/subscribe/mock-portal",
    ]);
    expect(violations).toHaveLength(2);
  });

  it("catches the public OneLingo pages", () => {
    const violations = findForbiddenRoutes([
      "/lingo",
      "/lingo/pricing",
      "/lingo/subscribe",
      "/lingo/subscribe/success",
    ]);
    expect(violations).toHaveLength(4);
    expect(violations.every((v) => v.id === "lingo-public-pages")).toBe(true);
  });

  it("keeps the OneLingo backend, admin panel and cron in production", () => {
    // The product still runs — only its public storefront is withdrawn. If this
    // ever goes red, the ban has widened past what was agreed and the editorial
    // team has silently lost the OneLingo admin panel.
    expect(
      findForbiddenRoutes([
        "/api/lingo/preferences",
        "/api/lingo/subscribe/checkout",
        "/api/lingo/subscribe/lookup",
        "/api/lingo/subscribe/portal",
        "/api/lingo/subscribe/resume-emails",
        "/api/lingo/verification/confirm",
        "/api/lingo/verification/request",
        "/api/cron/one-lingo",
        "/api/admin/lingo/lessons/action",
        "/admin/one-lingo",
        "/admin/one-lingo/lessons",
        "/admin/one-lingo/sends",
        "/admin/one-lingo/subscribers",
      ]),
    ).toEqual([]);
  });

  it("passes a realistic production route list", () => {
    expect(
      findForbiddenRoutes([
        "/",
        "/subscribe",
        "/preferences",
        "/pricing",
        "/article/subscribe",
        "/api/subscribe/lookup",
        "/api/subscribe/portal",
        "/api/subscribe/resume-emails",
        "/api/polar/checkout",
        "/api/webhook/polar",
        "/admin",
      ]),
    ).toEqual([]);
  });

  it("does not over-match adjacent real routes", () => {
    // The real subscribe API lives next door to the mock one; a sloppy
    // substring rule would ban the routes that are supposed to ship.
    expect(
      findForbiddenRoutes([
        "/api/subscribe/lookup",
        "/api/subscribe/mockingbird", // not the mock namespace
        "/article/subscribe/mockup", // not the mock- page prefix
        "/article/subscribe/success",
      ]),
    ).toEqual([]);
  });

  it("reports why each route is forbidden", () => {
    const [violation] = findForbiddenRoutes(["/api/subscribe/mock/complete"]);
    expect(violation.id).toBe("mock-billing-api");
    expect(violation.reason).toMatch(/ACTIVE_PAID/);
  });

  it("gives every rule an id and a reason", () => {
    for (const rule of FORBIDDEN_PRODUCTION_ROUTES) {
      expect(rule.id).toBeTruthy();
      expect(rule.reason.length).toBeGreaterThan(20);
    }
  });
});
