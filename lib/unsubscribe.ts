import { prisma } from "@/lib/prisma";

export interface HumanUnsubscribeInput {
  subscription?: string | null;
  send?: string | null;
  email?: string | null;
  scope?: string | null;
}

export async function describeUnsubscribeTarget(token: string | null | undefined): Promise<"OneArticle" | "OneNews" | "OneRead"> {
  const subscription = clean(token);
  if (!subscription) return "OneRead";
  const row = await prisma.productSubscription.findUnique({
    where: { unsubscribeToken: subscription }, select: { productKey: true },
  });
  return row?.productKey === "one-news" ? "OneNews" : row?.productKey === "one-article" ? "OneArticle" : "OneRead";
}

/** Email suppression only. This intentionally never updates billing fields. */
export async function unsubscribeHuman(input: HumanUnsubscribeInput): Promise<void> {
  const subscription = clean(input.subscription);
  if (subscription) {
    if (input.scope === "all") {
      const row = await prisma.productSubscription.findUnique({
        where: { unsubscribeToken: subscription }, select: { contactId: true },
      });
      if (row) await prisma.productSubscription.updateMany({
        where: { contactId: row.contactId, productKey: { in: ["one-article", "one-news"] } },
        data: { emailDeliveryStatus: "UNSUBSCRIBED" },
      });
      return;
    }
    await prisma.productSubscription.updateMany({
      where: { unsubscribeToken: subscription },
      data: { emailDeliveryStatus: "UNSUBSCRIBED" },
    });
    return;
  }
  const send = clean(input.send);
  const email = clean(input.email)?.toLowerCase();
  const row = send
    ? await prisma.dailySend.findUnique({ where: { id: send }, select: { subscriberId: true } })
    : email
      ? await prisma.subscriber.findUnique({ where: { email }, select: { id: true } })
      : null;
  const subscriberId = row && "subscriberId" in row ? row.subscriberId : row?.id;
  if (!subscriberId) return;
  await prisma.subscriber.updateMany({
    where: { id: subscriberId },
    data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
  });
}

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length <= 256 ? normalized : null;
}
