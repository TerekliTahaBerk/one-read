/**
 * Billing repair — the operator's controlled recovery command.
 *
 * Dry run (the default; writes nothing):
 *   npm run repair:billing -- --subscription=<id> --action=<action> --reason="..."
 *
 * Apply (writes one row, once, and records an audit event):
 *   npm run repair:billing -- --subscription=<id> --action=<action> --reason="..." \
 *     --actor="<who>" --apply --confirm=<id>
 *
 * Actions:
 *   apply_provider_snapshot     Make local billing state match Polar. Reads the
 *                               live provider subscription first.
 *   link_provider_subscription  Attach a provider subscription id to a row that
 *                               has none. Requires --provider-subscription=<id>.
 *   classify_offer              Record the offer a subscription was bought
 *                               under, from provider product evidence.
 *   clear_stale_checkout        Drop an expired checkout session.
 *
 * Two things make this safe to run against production:
 *
 *   • --apply alone is not enough. `--confirm=<subscription id>` must repeat the
 *     id being changed, so a command recalled from shell history cannot be
 *     re-fired against a different subscriber by accident.
 *   • The decision lives in lib/billing/repair.ts, not here. This file gathers
 *     inputs and prints results; every precondition, staleness guard and audit
 *     write is in the module, under test.
 */
import { prisma } from "../lib/prisma";
import {
  isRepairAction,
  repairSubscription,
  REPAIR_ACTIONS,
  type RepairRequest,
} from "../lib/billing/repair";
import { fetchPolarSubscriptionSnapshot, isPolarConfigured } from "../lib/billing/polar";
import type { ProviderSnapshot } from "../lib/billing/reconciliation";

function arg(name: string): string | null {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3).trim() : null;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const subscriptionId = arg("subscription");
  const action = arg("action");
  const reason = arg("reason");
  const actor = arg("actor") ?? "operator:cli";
  const apply = process.argv.includes("--apply");
  const confirm = arg("confirm");

  if (!subscriptionId) fail("--subscription=<ProductSubscription id> is required.");
  if (!action || !isRepairAction(action)) {
    fail(`--action must be one of: ${REPAIR_ACTIONS.join(", ")}`);
  }
  // A repair is a decision someone has to be able to explain later. The audit
  // record is worth nothing without it, so it is required, not optional.
  if (!reason) fail('--reason="why this repair is correct" is required.');
  if (apply && confirm !== subscriptionId) {
    fail("--apply requires --confirm=<the same subscription id> to proceed.");
  }

  let provider: ProviderSnapshot | null = null;
  if (action === "apply_provider_snapshot" || action === "classify_offer") {
    const sub = await prisma.productSubscription.findUnique({
      where: { id: subscriptionId },
      select: { providerSubscriptionId: true },
    });
    if (!sub) fail("No subscription with that id exists.");
    if (!sub.providerSubscriptionId) {
      fail(
        "This subscription holds no provider subscription id, so provider state cannot be read. " +
          "Link it first with --action=link_provider_subscription.",
      );
    }
    if (!isPolarConfigured()) fail("Polar is not configured in this environment.");
    provider = await fetchPolarSubscriptionSnapshot(sub.providerSubscriptionId);
    console.log("Provider snapshot:");
    console.log(JSON.stringify({ ...provider, productId: "(masked)" }, null, 2));
  }

  const request: RepairRequest = {
    action,
    subscriptionId,
    actor,
    reason,
    dryRun: !apply,
    provider,
    providerSubscriptionId: arg("provider-subscription"),
  };

  const result = await repairSubscription(request);

  console.log("");
  console.log(`mode:    ${result.dryRun ? "dry-run" : "apply"}`);
  console.log(`action:  ${result.action}`);
  console.log(`outcome: ${result.outcome}${result.refusal ? ` (${result.refusal})` : ""}`);
  console.log(`detail:  ${result.detail}`);
  if (result.plan) {
    console.log("\nchange:");
    console.log(JSON.stringify({ before: result.plan.before, after: result.plan.after }, null, 2));
  }
  if (result.auditId) console.log(`\naudit:   ${result.auditId}`);
  if (result.dryRun && result.outcome === "applied") {
    console.log(
      `\nTo apply: re-run with --apply --confirm=${subscriptionId}`,
    );
  }

  if (result.outcome === "refused") process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("ERR", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
