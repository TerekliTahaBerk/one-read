import { runEditorialCron } from "@/lib/admin/editorial-cron";
import { authorizeCronRequest, unauthorizedCronResponse } from "@/lib/admin/editorial-cron";
import { dispatchDueOneNewsIssues } from "@/lib/one-news/delivery";
import { PRODUCT_ONE_NEWS } from "@/lib/products/registry";
import { isSendDay } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handler(request: Request): Promise<Response> {
  if (!authorizeCronRequest(request)) return unauthorizedCronResponse();
  return runEditorialCron({
    productKey: PRODUCT_ONE_NEWS,
    productName: "OneNews",
    route: "/api/cron/news",
    heartbeatJob: "news",
    auditAction: "oneNews.editorial.dispatch",
    sendDays: [1, 3, 5],
    controls: {
      // Deployment alone can never activate the unreleased product.
      cronEnabled: process.env.ONENEWS_DELIVERY_ENABLED === "true",
      dryRun: process.env.ONENEWS_DRY_RUN === "true",
      requireApproval: true,
    },
    // Poll every day so a Friday→Monday calendar gap cannot hide a missed run
    // from an interval heartbeat. Non-publication days are healthy no-ops.
    dispatch: isSendDay(new Date(), "Europe/Istanbul", ["MON", "WED", "FRI"])
      ? dispatchDueOneNewsIssues
      : async () => ({ issues: 0, recipients: 0, sent: 0, failed: 0, skipped: 0 }),
  });
}

export const GET = handler;
export const POST = handler;
