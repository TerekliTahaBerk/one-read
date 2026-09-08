import { getRuntimeSettings, sendDayCodes } from "@/lib/admin/settings-store";
import {
  authorizeCronRequest,
  runEditorialCron,
  unauthorizedCronResponse,
} from "@/lib/admin/editorial-cron";
import { dispatchDueEditorialIssues } from "@/lib/one-article/editorial";
import { ONE_ARTICLE_PRODUCT_KEY } from "@/lib/options";
import { ONE_ARTICLE_DEFAULT_SEND_DAYS, sendDayNumbers } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * OneArticle editorial dispatcher. Content creation is deliberately absent:
 * the panel owns copy, readiness and scheduling; cron only sends due editions.
 * Run tracking and outage handling live in `@/lib/admin/editorial-cron`.
 *
 * Controls *and* publication days come from the panel settings store, so what
 * an operator sets on /admin/settings is what this route actually does.
 */
async function handler(request: Request): Promise<Response> {
  if (!authorizeCronRequest(request)) return unauthorizedCronResponse();

  const settings = await getRuntimeSettings();
  const sendDays = sendDayCodes(settings.oneArticleSendDays, ONE_ARTICLE_DEFAULT_SEND_DAYS);
  return runEditorialCron({
    productKey: ONE_ARTICLE_PRODUCT_KEY,
    productName: "OneArticle",
    route: "/api/cron/daily",
    heartbeatJob: "daily",
    auditAction: "oneArticle.editorial.dispatch",
    sendDays: sendDayNumbers(sendDays),
    controls: settings.controls.oneArticle,
    controlsDegraded: settings.degraded,
    dispatch: () => dispatchDueEditorialIssues(new Date(), { sendDays }),
  });
}

export const GET = handler;
export const POST = handler;
