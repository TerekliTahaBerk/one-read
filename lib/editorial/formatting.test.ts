import { describe, expect, it } from "vitest";
import { editorialTextToHtml, editorialTextToPlainText } from "./formatting";

describe("editorial formatting", () => {
  it("renders supported editorial blocks", () => {
    const html = editorialTextToHtml(
      "## Why it matters\n\nA **clear** paragraph with _emphasis_.\n\n- First\n- Second\n\n> A useful line.",
    );
    expect(html).toContain("<h2");
    expect(html).toContain("<strong>clear</strong>");
    expect(html).toContain("<em>emphasis</em>");
    expect(html).toContain("<ul");
    expect(html).toContain("<blockquote");
  });

  it("allows safe links and escapes arbitrary HTML", () => {
    const html = editorialTextToHtml(
      `[Primary source](https://example.com/read?a=1&b=2) <script>alert("x")</script>`,
    );
    expect(html).toContain('href="https://example.com/read?a=1&amp;b=2"');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("creates a readable plain-text alternative", () => {
    expect(
      editorialTextToPlainText("## Note\n\nA **good** [source](https://example.com).\n\n- One"),
    ).toBe("Note\n\nA good source (https://example.com).\n\n• One");
  });
});
