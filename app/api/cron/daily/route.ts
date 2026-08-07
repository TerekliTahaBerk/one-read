import { readControls } from "@/lib/admin/settings-store";
import {
  authorizeCronRequest,
  runEditorialCron,
  unauthorizedCronResponse,
} from "@/lib/admin/editorial-cron";
import { dispatchDueEditorialIssues } from "@/lib/one-article/editorial";
import { ONE_ARTICLE_PRODUCT_KEY } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * OneArticle editorial dispatcher. Content creation is deliberately absent:
 * the panel owns copy, readiness and scheduling; cron only sends due editions.
 * Run tracking and outage handling are shared with OneFilm in
 * `@/lib/admin/editorial-cron`.
 */
async function handler(request: Request): Promise<Response> {
  if (!authorizeCronRequest(request)) return unauthorizedCronResponse();

  const snapshot = await readControls();
  return runEditorialCron({
    productKey: ONE_ARTICLE_PRODUCT_KEY,
    productName: "OneArticle",
    route: "/api/cron/daily",
    auditAction: "oneArticle.editorial.dispatch",
    sendDays: [1, 2, 3, 4, 5],
    controls: snapshot.controls.oneArticle,
    controlsDegraded: snapshot.degraded,
    dispatch: dispatchDueEditorialIssues,
  });
}

export const GET = handler;
export const POST = handler;
