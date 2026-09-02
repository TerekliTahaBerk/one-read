/**
 * Production / preview isolation (Milestone C2, Task 21).
 *
 * These tests need no Polar credentials and make no network call — which is
 * itself part of the guarantee being tested.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isPolarConfigurationSafe,
  polarEnvironment,
  validatePolarConfiguration,
} from "@/lib/products/polar-config";
import {
  LEGACY_ONEREAD_PRODUCT_ID,
  clearOfferEnv,
  configureAllOffers,
  testProductId,
} from "@/test/fixtures/polar-offers";

const originalServer = process.env.POLAR_SERVER;

beforeEach(() => configureAllOffers());
afterEach(() => {
  clearOfferEnv();
  if (originalServer === undefined) delete process.env.POLAR_SERVER;
  else process.env.POLAR_SERVER = originalServer;
});

describe("polarEnvironment fails towards sandbox", () => {
  it.each([
    [undefined, "sandbox"],
    ["", "sandbox"],
    ["sandbox", "sandbox"],
    ["Production", "sandbox"],
    ["production ", "sandbox"],
    ["prod", "sandbox"],
    ["production", "production"],
  ])("POLAR_SERVER=%s → %s", (value, expected) => {
    if (value === undefined) delete process.env.POLAR_SERVER;
    else process.env.POLAR_SERVER = value;
    expect(polarEnvironment()).toBe(expected);
  });

  it("only the exact string enables real charging", () => {
    delete process.env.POLAR_SERVER;
    expect(polarEnvironment()).toBe("sandbox");
  });
});

describe("validatePolarConfiguration", () => {
  it("reports nothing when all six offers are configured distinctly", () => {
    expect(validatePolarConfiguration()).toEqual([]);
    expect(isPolarConfigurationSafe()).toBe(true);
  });

  it("treats missing configuration as an error in production, a warning elsewhere", () => {
    configureAllOffers({ except: ["POLAR_ONE_NEWS_ANNUAL_PRODUCT_ID"] });

    process.env.POLAR_SERVER = "production";
    expect(validatePolarConfiguration()[0]).toMatchObject({ severity: "error" });

    process.env.POLAR_SERVER = "sandbox";
    expect(validatePolarConfiguration()[0]).toMatchObject({ severity: "warning" });
  });

  it("refuses a legacy product id configured as a current offer", () => {
    process.env.POLAR_ONE_READ_MONTHLY_PRODUCT_ID = LEGACY_ONEREAD_PRODUCT_ID;

    const problems = validatePolarConfiguration();
    expect(problems.some((p) => p.severity === "error" && /legacy product id/.test(p.message))).toBe(
      true,
    );
    expect(isPolarConfigurationSafe()).toBe(false);
  });

  it("refuses the same product id shared by two offers", () => {
    process.env.POLAR_ONE_NEWS_MONTHLY_PRODUCT_ID = testProductId("one-article", "monthly");

    const problems = validatePolarConfiguration();
    expect(problems.some((p) => /share the same Polar product id/.test(p.message))).toBe(true);
    expect(isPolarConfigurationSafe()).toBe(false);
  });

  it("does not require any Polar secret to validate", () => {
    delete process.env.POLAR_ACCESS_TOKEN;
    delete process.env.POLAR_WEBHOOK_SECRET;
    expect(() => validatePolarConfiguration()).not.toThrow();
  });
});
