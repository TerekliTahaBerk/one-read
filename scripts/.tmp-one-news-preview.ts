import { writeFileSync } from "node:fs";
import { buildOneNewsRenderModel } from "@/lib/one-news/render-model";
import { renderOneNewsEmail } from "@/lib/one-news/email";
import {
  sampleOneNewsCorrections,
  sampleOneNewsRenderIssue,
  sampleOneNewsRenderSources,
} from "@/lib/one-news/fixtures";

const model = buildOneNewsRenderModel(
  sampleOneNewsRenderIssue({
    developing: true,
    asOf: new Date("2026-09-02T06:30:00.000Z"),
    whatsContested:
      "The plaintiffs read the ruling as binding nationwide; the defendants say it reaches one circuit only, and two law professors quoted below disagree about which reading survives appeal.",
    whatHappened:
      "An appeals court held that a platform, not its business customers, carries the cost of a breach it could have prevented.\n\nThe panel split 2-1. The majority leaned on the platform's own security documentation, which promised controls the court found were never implemented.",
    whyItMatters:
      "Liability has sat with the smallest party in the chain for a decade. Moving it upstream changes what a platform's security promises are worth in court.\n\n- Vendors gain a defense they did not have\n- Platforms carry new disclosure risk\n- Insurers reprice both sides",
    whatToWatch:
      "Whether the losing side seeks review, and whether regulators cite the reasoning in pending rulemaking.",
  }),
  sampleOneNewsRenderSources(),
  sampleOneNewsCorrections(),
);
const rendered = renderOneNewsEmail(model, {
  unsubscribe: "https://oneread.email/unsubscribe?subscription=preview-token",
});
writeFileSync(process.argv[2], rendered.html);
console.log("--- PLAIN TEXT ---\n" + rendered.text);
