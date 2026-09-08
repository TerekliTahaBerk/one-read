import { runEditorialCron } from "@/lib/admin/editorial-cron";
import { authorizeCronRequest, unauthorizedCronResponse } from "@/lib/admin/editorial-cron";
import { getRuntimeSettings, sendDayCodes } from "@/lib/admin/settings-store";
import { dispatchDueOneNewsIssues } from "@/lib/one-news/delivery";
import { PRODUCT_ONE_NEWS } from "@/lib/products/registry";
import { isSendDay, ONE_NEWS_DEFAULT_SEND_DAYS, sendDayNumbers } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * OneNews editorial dispatcher. Enablement, dry-run and publication days come
 * from the panel settings store, whose OneNews defaults still resolve to the
 * env vars (`ONENEWS_DELIVERY_ENABLED` off by default) — deployment alone can
 * never activate the product, but an operator no longer needs a redeploy to
 * pause or preview it.
 */
async function handler(request: Request): Promise<Response> {
  if (!authorizeCronRequest(request)) return unauthorizedCronResponse();
  const settings = await getRuntimeSettings();
  const sendDays = sendDayCodes(settings.oneNewsSendDays, ONE_NEWS_DEFAULT_SEND_DAYS);
  return runEditorialCron({
    productKey: PRODUCT_ONE_NEWS,
    productName: "OneNews",
    route: "/api/cron/news",
    heartbeatJob: "news",
    auditAction: "oneNews.editorial.dispatch",
    sendDays: sendDayNumbers(sendDays),
    controls: settings.controls.oneNews,
    controlsDegraded: settings.degraded,
    // Poll every day so a Friday→Monday calendar gap cannot hide a missed run
    // from an interval heartbeat. Non-publication days are healthy no-ops.
    dispatch: isSendDay(new Date(), "Europe/Istanbul", sendDays)
      ? dispatchDueOneNewsIssues
      : async () => ({ issues: 0, recipients: 0, sent: 0, failed: 0, skipped: 0 }),
  });
}

export const GET = handler;
export const POST = handler;
