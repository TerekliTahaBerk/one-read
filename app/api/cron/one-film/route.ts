import { readControls } from "@/lib/admin/settings-store";
import {
  authorizeCronRequest,
  runEditorialCron,
  unauthorizedCronResponse,
} from "@/lib/admin/editorial-cron";
import { dispatchDueFilmEditorialIssues } from "@/lib/film/editorial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * OneFilm editorial dispatcher. Identical in shape and failure semantics to
 * OneArticle's — both share `@/lib/admin/editorial-cron`; only the product
 * identity, dispatcher and publishing days differ.
 */
async function handler(request: Request): Promise<Response> {
  if (!authorizeCronRequest(request)) return unauthorizedCronResponse();

  const snapshot = await readControls();
  return runEditorialCron({
    productKey: "one-film",
    productName: "OneFilm",
    route: "/api/cron/one-film",
    auditAction: "oneFilm.editorial.dispatch",
    sendDays: [6],
    controls: snapshot.controls.film,
    controlsDegraded: snapshot.degraded,
    dispatch: dispatchDueFilmEditorialIssues,
  });
}

export const GET = handler;
export const POST = handler;
