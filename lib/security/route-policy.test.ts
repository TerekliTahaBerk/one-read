import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_PRODUCTION_ROUTES,
  MOBILE_PAGE_EXTENSIONS,
  MOCK_PAGE_EXTENSIONS,
  findForbiddenRoutes,
  mockBillingSurfaceEnabled,
  pageExtensionsFor,
} from "./route-policy.mjs";

describe("mock billing build gate", () => {
  it("cannot be enabled on the production deployment", () => {
    expect(mockBillingSurfaceEnabled({
      VERCEL_ENV: "production",
      NODE_ENV: "development",
      MOCK_BILLING_PREVIEW: "true",
    })).toBe(false);
  });

  it("keeps postponed mobile routes out of production builds", () => {
    expect(pageExtensionsFor({ NODE_ENV: "development" })).toEqual(
      expect.arrayContaining(MOBILE_PAGE_EXTENSIONS),
    );
    expect(pageExtensionsFor({ VERCEL_ENV: "production", NODE_ENV: "production", MOBILE_PREVIEW: "true" }))
      .not.toEqual(expect.arrayContaining(MOBILE_PAGE_EXTENSIONS));
    expect(findForbiddenRoutes(["/api/mobile/v1/home"])).toHaveLength(1);
  });

  it("is available locally but excluded from a normal production build", () => {
    expect(mockBillingSurfaceEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(mockBillingSurfaceEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(pageExtensionsFor({ NODE_ENV: "development" })).toEqual(
      expect.arrayContaining(MOCK_PAGE_EXTENSIONS),
    );
    expect(pageExtensionsFor({ VERCEL_ENV: "production", NODE_ENV: "production" }))
      .not.toEqual(expect.arrayContaining(MOCK_PAGE_EXTENSIONS));
  });
});

describe("production route policy", () => {
  it("rejects every retired public, API, cron, and admin surface", () => {
    const retired = [
      "/film", "/samples/film", "/lingo", "/waitlist",
      "/api/film/preferences", "/api/lingo/preferences", "/api/one-article/verification/request",
      "/api/signup/request", "/api/subscribe/lookup", "/api/polar/checkout",
      "/api/cron/one-film", "/api/cron/one-lingo",
      "/api/admin/film/action", "/api/admin/lingo/action",
      "/admin/one-film", "/admin/one-lingo",
    ];
    const violations = findForbiddenRoutes(retired);
    for (const route of retired) {
      expect(violations.some((violation) => violation.route === route)).toBe(true);
    }
  });

  it("allows the OneArticle launch surface", () => {
    expect(findForbiddenRoutes([
      "/", "/article", "/pricing", "/subscribe", "/preferences",
      "/samples/article", "/api/oneread/lookup", "/api/oneread/checkout",
      "/api/webhook/polar", "/api/webhook/resend", "/api/cron/daily",
      "/admin", "/admin/one-article",
    ])).toEqual([]);
  });

  it("documents every deny rule", () => {
    for (const rule of FORBIDDEN_PRODUCTION_ROUTES) {
      expect(rule.id).toBeTruthy();
      expect(rule.reason.length).toBeGreaterThan(20);
    }
  });
});
