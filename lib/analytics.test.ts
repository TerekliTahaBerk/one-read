import { describe, expect, it, vi } from "vitest";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

import { sanitizeProperties } from "./analytics";

describe("analytics property sanitizer", () => {
  it("keeps the allow-listed product properties", () => {
    expect(
      sanitizeProperties({
        product: "one-article",
        interval: "monthly",
        readingLanguage: "English",
        campaign: "launch",
      }),
    ).toEqual({
      product: "one-article",
      interval: "monthly",
      readingLanguage: "English",
      campaign: "launch",
    });
  });

  it("drops any property outside the allow-list", () => {
    const dirty = {
      product: "one-article",
      email: "reader@example.com",
      code: "123456",
      polarCustomerId: "cus_abc",
    } as Record<string, string>;

    expect(sanitizeProperties(dirty)).toEqual({ product: "one-article" });
  });

  it("rejects an allow-listed key whose value looks like an address", () => {
    expect(sanitizeProperties({ campaign: "reader@example.com" })).toEqual({});
  });

  it("rejects an allow-listed key whose value looks like an opaque token", () => {
    expect(sanitizeProperties({ campaign: "sub_01HQ3ZK9WJ7M2N4P6R8T0V" })).toEqual({});
  });

  it("ignores empty, oversized, and non-string values", () => {
    expect(
      sanitizeProperties({
        product: "   ",
        campaign: "x".repeat(65),
        interval: 12 as unknown as string,
      }),
    ).toEqual({});
  });

  it("returns an empty object when given no properties", () => {
    expect(sanitizeProperties()).toEqual({});
  });
});
