import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordFeedback, REACTIONS, type Reaction } from "@/lib/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET/POST /api/feedback
 *
 * Triggered from one-click reaction links inside daily emails.
 *
 * Query params:
 *   send     — DailySend.id, identifies subscriber + article context
 *   r        — reaction: loved | liked | meh | disliked
 *   preview  — "1" for /api/admin/test-email previews; renders the
 *              thank-you page without mutating anything.
 *
 * The endpoint is idempotent-friendly: hitting it twice for the same
 * (sendId, reaction) only stores one feedback entry per click but is
 * tolerant of refreshes.
 *
 * Returns a small HTML thank-you page (since these are email links).
 */
async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sendId = url.searchParams.get("send");
  const r = url.searchParams.get("r") as Reaction | null;
  const isPreview = url.searchParams.get("preview") === "1";

  if (!r || !REACTIONS.includes(r)) {
    return htmlResponse(
      thankYouPage("Thanks — but that link looks malformed."),
      400,
    );
  }

  // Preview links (from the admin test email) must not mutate real data —
  // there's no DailySend behind them. Render the friendly page only.
  if (isPreview) {
    const message =
      r === "loved" || r === "liked"
        ? "Thanks — we'll keep finding more like that. (preview)"
        : "Thanks — we'll do better tomorrow. (preview)";
    return htmlResponse(thankYouPage(message), 200);
  }

  if (!sendId) {
    return htmlResponse(
      thankYouPage("Thanks — but that link looks malformed."),
      400,
    );
  }

  try {
    const send = await prisma.dailySend.findUnique({
      where: { id: sendId },
      include: { pick: true },
    });
    if (!send) {
      return htmlResponse(
        thankYouPage("Thanks — but we couldn't find that send."),
        404,
      );
    }

    await recordFeedback({
      subscriberId: send.subscriberId,
      reaction: r,
      topic: send.matchedTopic,
      sourceName: send.pick.sourceName,
      articleId: send.pick.articleId,
    });

    const message =
      r === "loved" || r === "liked"
        ? "Thanks — we'll keep finding more like that."
        : "Thanks — we'll do better tomorrow.";
    return htmlResponse(thankYouPage(message), 200);
  } catch (err) {
    console.error("[/api/feedback] error:", err);
    return htmlResponse(thankYouPage("Thanks — noted."), 200);
  }
}

export const GET = handler;
export const POST = handler;

/* ----------------------------------------------------------------------- */
/* HTML helpers                                                            */
/* ----------------------------------------------------------------------- */

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function thankYouPage(message: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OneRead — Thanks</title>
  <style>
    body{margin:0;background:#F6F1E6;color:#1B1612;font-family:ui-sans-serif,system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;}
    .card{max-width:420px;text-align:center;}
    .mark{font-family:ui-serif,Georgia,Cambria,serif;font-style:italic;text-transform:uppercase;letter-spacing:0.22em;font-size:12.5px;color:#1B1612;margin-bottom:32px;}
    h1{font-family:ui-serif,Georgia,Cambria,serif;font-weight:500;font-size:28px;line-height:1.15;letter-spacing:-0.012em;margin:0 0 14px 0;}
    p{color:#6B5F50;font-size:14px;line-height:1.65;margin:0;}
    .tagline{margin-top:32px;font-family:ui-serif,Georgia,Cambria,serif;font-style:italic;color:#9C8F7E;font-size:13px;}
  </style>
</head>
<body>
  <div class="card">
    <div class="mark">OneRead</div>
    <h1>Thanks for the note.</h1>
    <p>${escapeHtml(message)}</p>
    <div class="tagline">One article. Every morning. Curated for you.</div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
