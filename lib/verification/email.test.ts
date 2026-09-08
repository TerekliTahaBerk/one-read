import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { renderVerificationHtml, renderVerificationText } from "./email";
import { verificationCopy, verificationLocale } from "./email-copy";
import type { VerificationDescriptor } from "./core";
import { productThemes } from "../product-themes";

const product: VerificationDescriptor = {
  key: "one-read", purposes: { signup: "signup", preferences: "preferences" }, cookieName: "verified",
  email: { brandLine: "OneRead", productName: "OneRead", theme: { ...productThemes.read, surface: "#FFFFFF" } },
};

describe("verification email", () => {
  it.each(["en", "tr", "es", "fr", "de"])("localizes HTML, text and subject in %s without exposing the OTP in the preheader", (language) => {
    const html = renderVerificationHtml(product, "012345", 7, language);
    const text = renderVerificationText(product, "012345", 7, language);
    const copy = verificationCopy(language, "OneRead", 7);
    const document = new JSDOM(html).window.document;
    expect(document.documentElement.lang).toBe(language);
    expect(document.title).toBe(copy.subject);
    expect(document.body.firstElementChild?.textContent).toContain(copy.expiry);
    expect(document.body.firstElementChild?.textContent).not.toMatch(/012\s?345/);
    expect(copy.subject).not.toContain("012345");
    expect(document.querySelector('[dir="ltr"]')?.textContent).toBe("012345");
    expect(document.body.textContent).toContain(copy.security);
    expect(text).toContain(copy.security);
    expect(text).toContain(copy.expiry);
    expect(text).toContain("012 345");
    expect(text).not.toContain("OneArticle");
  });

  it("escapes product text", () => {
    const html = renderVerificationHtml({ ...product, email: { ...product.email, productName: '<script>alert(1)</script>' } }, "012345", 10);
    expect(html).not.toContain("<script>");
  });

  it("resolves explicit locale first, then weighted browser languages, then English", () => {
    expect(verificationLocale("tr", "en-US")).toBe("tr");
    expect(verificationLocale("French")).toBe("fr");
    expect(verificationLocale(undefined, "ja, de-DE;q=0.9,en;q=0.7")).toBe("de");
    expect(verificationLocale({}, "tr;q=0,en;q=0.5")).toBe("en");
    expect(verificationLocale("unknown", "es-MX;q=0.2,fr;q=0.8")).toBe("fr");
    expect(verificationLocale(null, "xx")).toBe("en");
  });
});
