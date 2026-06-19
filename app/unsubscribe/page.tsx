import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /unsubscribe
 *
 * Linked from the footer of every daily email. Idempotent: visiting twice
 * is a no-op. Two ways to identify the subscriber:
 *
 *   ?send=<DailySend.id>   — preferred, opaque, comes from the email
 *   ?email=<email>         — fallback for support cases (web only)
 *   ?subscription=<ProductSubscription.unsubscribeToken>
 *                          — product-scoped fallback used by OneLingo
 *   ?preview=1             — used by /api/admin/test-email previews;
 *                            renders the page without mutating anything.
 *
 * Returns a small editorial confirmation page that mirrors the rest of
 * the OneRead aesthetic.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: { send?: string; email?: string; subscription?: string; preview?: string };
}) {
  const isPreview = searchParams.preview === "1";
  const message: UnsubscribeResult = isPreview
    ? {
        headline: "Preview mode.",
        body: "This is a preview. Real subscribers would now be unsubscribed.",
      }
    : await applyUnsubscribe(
        searchParams.send,
        searchParams.email,
        searchParams.subscription,
      );

  return (
    <main
      style={{
        margin: 0,
        background: "#F6F1E6",
        color: "#1B1612",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 460, textAlign: "center" }}>
        <div
          style={{
            fontFamily: "ui-serif, Georgia, Cambria, serif",
            fontStyle: "italic",
            textTransform: "uppercase",
            letterSpacing: "0.22em",
            fontSize: 12.5,
            marginBottom: 32,
          }}
        >
          OneRead
        </div>
        <h1
          style={{
            fontFamily: "ui-serif, Georgia, Cambria, serif",
            fontWeight: 500,
            fontSize: 28,
            lineHeight: 1.15,
            letterSpacing: "-0.012em",
            margin: "0 0 14px 0",
          }}
        >
          {message.headline}
        </h1>
        <p style={{ color: "#6B5F50", fontSize: 14, lineHeight: 1.65, margin: 0 }}>
          {message.body}
        </p>
        <div
          style={{
            marginTop: 32,
            fontFamily: "ui-serif, Georgia, Cambria, serif",
            fontStyle: "italic",
            color: "#9C8F7E",
            fontSize: 13,
          }}
        >
          One article. Every morning. Curated for you.
        </div>
      </div>
    </main>
  );
}

interface UnsubscribeResult {
  headline: string;
  body: string;
}

async function applyUnsubscribe(
  sendId: string | undefined,
  email: string | undefined,
  subscriptionToken: string | undefined,
): Promise<UnsubscribeResult> {
  try {
    if (subscriptionToken) {
      const sub = await prisma.productSubscription.findUnique({
        where: { unsubscribeToken: subscriptionToken },
        select: { id: true, emailDeliveryStatus: true, productKey: true },
      });
      if (!sub) {
        return {
          headline: "We couldn't find that subscription.",
          body: "If this is unexpected, reply to any OneRead email and we'll fix it.",
        };
      }
      if (sub.emailDeliveryStatus === "UNSUBSCRIBED") {
        return {
          headline: "You're already unsubscribed.",
          body: "No further emails will arrive. Take care.",
        };
      }
      await prisma.productSubscription.update({
        where: { id: sub.id },
        data: { emailDeliveryStatus: "UNSUBSCRIBED" },
      });
      return {
        headline: "You're unsubscribed.",
        body: `No more ${productLabel(sub.productKey)} emails. If you change your mind, you can resume emails from the subscribe page.`,
      };
    }

    let subscriberId: string | null = null;

    if (sendId) {
      const send = await prisma.dailySend.findUnique({
        where: { id: sendId },
        select: { subscriberId: true },
      });
      subscriberId = send?.subscriberId ?? null;
    } else if (email) {
      const sub = await prisma.subscriber.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id: true },
      });
      subscriberId = sub?.id ?? null;
    }

    if (!subscriberId) {
      return {
        headline: "We couldn't find that subscription.",
        body: "If this is unexpected, reply to any OneRead email and we'll fix it.",
      };
    }

    const before = await prisma.subscriber.findUnique({
      where: { id: subscriberId },
      select: { status: true },
    });
    if (before?.status === "UNSUBSCRIBED") {
      return {
        headline: "You're already unsubscribed.",
        body: "No further emails will arrive. Take care.",
      };
    }

    await prisma.subscriber.update({
      where: { id: subscriberId },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    });

    return {
      headline: "You're unsubscribed.",
      body: "No more emails from OneRead. If you change your mind, you can sign up again any morning.",
    };
  } catch (err) {
    console.error("[/unsubscribe] error:", err);
    return {
      headline: "Something went wrong.",
      body: "We've logged it. Please try again, or reply to any OneRead email.",
    };
  }
}

function productLabel(productKey: string): string {
  return productKey === "one-lingo" ? "OneLingo" : "OneRead";
}
