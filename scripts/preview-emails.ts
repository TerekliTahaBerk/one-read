/** Local, synthetic previews only. Never sends email or connects to the database. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderVerificationHtml } from "../lib/verification/email";
import { productThemes } from "../lib/product-themes";
import { renderEditorialEmail } from "../lib/one-article/editorial-email";
import { renderOneNewsEmail } from "../lib/one-news/email";
import { buildOneNewsRenderModel } from "../lib/one-news/render-model";
import { sampleOneNewsRenderIssue, sampleOneNewsRenderSources } from "../lib/one-news/fixtures";

async function main() {
  const output = resolve(process.argv[2] ?? "/tmp/oneread-email-previews");
  await mkdir(output, { recursive: true });
  const links = { unsubscribe: "https://example.com/unsubscribe" };
  const rows: string[] = [];
  for (const [locale, language] of Object.entries({ en: "English", tr: "Turkish", es: "Spanish", fr: "French", de: "German" })) {
    const verification = renderVerificationHtml({
      key: "one-read", purposes: { signup: "signup", preferences: "preferences" }, cookieName: "preview",
      email: { brandLine: "OneRead", productName: "OneRead", theme: { ...productThemes.read, surface: "#FFFFFF" } },
    }, "012345", 10, locale);
    const article = renderEditorialEmail({
      readingLanguage: language, subject: "One clear idea for today", previewText: "A little space to think can change the shape of a day.",
      headline: "The value of paying attention", bodyText: "Attention is a choice we make, moment by moment. A quiet morning offers the space to notice what usually passes us by.\n\nSmall habits can help: read one thoughtful piece, take a short walk, and leave a little room for an unexpected idea.",
      bodyHtml: null, heroImageUrl: null, heroImageAlt: null, heroImageCredit: null,
      sourceTitle: "On attention", sourceName: "Example Journal", sourceUrl: "https://example.com/article", ctaLabel: null,
      scheduledFor: new Date("2026-09-08T04:00:00Z"),
    }, links).html;
    const news = renderOneNewsEmail(buildOneNewsRenderModel(sampleOneNewsRenderIssue({
      readingLanguage: language,
      whatHappened: "In this fictional example, an appeals court places responsibility for a preventable data breach on the platform that operated the service. The decision focuses on the safeguards the platform controlled.",
      whyItMatters: "The distinction changes how businesses assess the services they depend on. Contracts and technical controls may need to reflect who can actually prevent an incident, and who should bear its cost.",
      whatToWatch: "Watch for an appeal and for changes to platform contracts. The scope of the ruling matters: it applies within one circuit and does not settle every question about data security.",
    }), sampleOneNewsRenderSources()), links).html;
    for (const [family, html] of Object.entries({ verification, article, news })) {
      const name = `${family}-${locale}.html`;
      await writeFile(resolve(output, name), html);
      rows.push(`<li><a href="${name}">${family} · ${language}</a></li>`);
    }
  }
  await writeFile(resolve(output, "index.html"), `<!doctype html><html lang="en"><title>OneRead email previews</title><body style="font:16px/1.6 Arial;padding:32px"><h1>OneRead email previews</h1><p>Synthetic content; no messages are sent. Newsletter body text is an English fixture; chrome follows the selected language.</p><ul>${rows.join("")}</ul></body></html>`);
  console.log(output);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
