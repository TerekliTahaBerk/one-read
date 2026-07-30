import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteSiteUrl, getSiteOrigin } from "./site-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("canonical site URL", () => {
  it("normalizes the redirecting apex domain to the canonical www host", () => {
    vi.stubEnv("PUBLIC_BASE_URL", "https://oneread.email");
    expect(getSiteOrigin()).toBe("https://www.oneread.email");
    expect(absoluteSiteUrl("/blog")).toBe("https://www.oneread.email/blog");
  });

  it("keeps explicitly configured non-production hosts", () => {
    vi.stubEnv("PUBLIC_BASE_URL", "https://preview.example.com/some-path");
    expect(getSiteOrigin()).toBe("https://preview.example.com");
  });

  it("falls back safely when the configured URL is invalid", () => {
    vi.stubEnv("PUBLIC_BASE_URL", "not a url");
    expect(getSiteOrigin()).toBe("https://www.oneread.email");
  });
});

