import { describe, expect, it } from "vitest";
import { isSafeHttpUrl, isSafeHttpsUrl, sourceHostLabel } from "./url-safety";

describe("isSafeHttpUrl", () => {
  it("accepts ordinary http and https links", () => {
    expect(isSafeHttpUrl("https://example.com/story")).toBe(true);
    expect(isSafeHttpUrl("http://example.com/story")).toBe(true);
    expect(isSafeHttpUrl("https://example.gov/a-b-c?x=1#y")).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "mailto:editor@example.com",
    "//example.com/protocol-relative",
    "not a url",
    "https://exa mple.com",
    "",
    "   ",
  ])("rejects %s", (value) => {
    expect(isSafeHttpUrl(value)).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isSafeHttpUrl(null)).toBe(false);
    expect(isSafeHttpUrl(undefined)).toBe(false);
  });

  it("rejects a link carrying an embedded newline", () => {
    expect(isSafeHttpUrl("https://example.com/a\nb")).toBe(false);
  });
});

describe("isSafeHttpsUrl", () => {
  it("accepts https only", () => {
    expect(isSafeHttpsUrl("https://example.com/x")).toBe(true);
    expect(isSafeHttpsUrl("http://example.com/x")).toBe(false);
  });
});

describe("sourceHostLabel", () => {
  it("normalizes the host for independence checks", () => {
    expect(sourceHostLabel("https://WWW.Example.com/story")).toBe("example.com");
    expect(sourceHostLabel("https://news.example.com/story")).toBe("news.example.com");
    expect(sourceHostLabel("javascript:alert(1)")).toBe(null);
    expect(sourceHostLabel("nonsense")).toBe(null);
  });
});
