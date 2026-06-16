/**
 * Prints a billing/subscription overview for One Article. Read-only.
 * Run: npm run inspect:billing
 */
import { prisma } from "../lib/prisma";
import { ONE_ARTICLE_PRODUCT_KEY } from "../lib/options";
import { evaluateEligibility } from "../lib/subscriptions";

function tally<T extends string>(rows: { [k: string]: unknown }[], key: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const v = (r[key] ?? "—") as T;
    out[v] = (out[v] ?? 0) + 1;
  }
  return out;
}

async function main() {
  const contacts = await prisma.contact.count();
  const subs = await prisma.productSubscription.findMany({
    where: { productKey: ONE_ARTICLE_PRODUCT_KEY },
    include: { preferences: true },
  });

  const eligibility: Record<string, number> = {};
  let eligible = 0;
  for (const s of subs) {
    const r = evaluateEligibility(s);
    if (r.allowed) eligible++;
    eligibility[r.reason] = (eligibility[r.reason] ?? 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        contacts,
        productSubscriptions: subs.length,
        byAccessStatus: tally(subs, "status"),
        byProvider: tally(subs.map((s) => ({ provider: s.paymentProvider })), "provider"),
        byPlan: tally(subs.map((s) => ({ plan: s.plan })), "plan"),
        byEmailDelivery: tally(subs, "emailDeliveryStatus"),
        eligible,
        ineligible: subs.length - eligible,
        eligibilityReasons: eligibility,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error("ERR", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
