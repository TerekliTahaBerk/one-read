import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Database-side delivery aggregation.
 *
 * Admin screens must never pull the delivery table into JavaScript just to
 * count rows, so every figure here comes from a `groupBy`. Logical send state
 * and provider delivery state are counted separately because they answer
 * different questions: whether OneRead finished its work, and whether the
 * mailbox actually received the mail.
 */
export interface DeliveryStateCounts {
  /** Counts keyed by OneRead's logical send status. */
  logical: Record<string, number>;
  /** Counts keyed by provider delivery status; unreported rows are omitted. */
  provider: Record<string, number>;
  total: number;
  /** Logical send failures plus provider-confirmed failures. */
  failed: number;
  /** Sends whose acceptance could not be proven. Never auto-resent. */
  ambiguous: number;
  /** Accepted by Resend but with no terminal provider event yet. */
  awaitingProvider: number;
  /** Rows the provider has never reported on (queued, skipped, or ambiguous). */
  noProviderEvent: number;
}

const EMPTY: DeliveryStateCounts = {
  logical: {},
  provider: {},
  total: 0,
  failed: 0,
  ambiguous: 0,
  awaitingProvider: 0,
  noProviderEvent: 0,
};

/** Passing `null` (e.g. no edition today) short-circuits without querying. */
export async function countDeliveryStates(
  where: Prisma.OneArticleDeliveryWhereInput | null,
): Promise<DeliveryStateCounts> {
  if (!where) return EMPTY;

  const [byStatus, byProviderStatus] = await Promise.all([
    prisma.oneArticleDelivery.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.oneArticleDelivery.groupBy({
      by: ["providerStatus"],
      where,
      _count: { _all: true },
    }),
  ]);

  const logical: Record<string, number> = {};
  let total = 0;
  for (const row of byStatus) {
    logical[row.status] = row._count._all;
    total += row._count._all;
  }

  const provider: Record<string, number> = {};
  let noProviderEvent = 0;
  for (const row of byProviderStatus) {
    if (row.providerStatus === null) noProviderEvent += row._count._all;
    else provider[row.providerStatus] = row._count._all;
  }

  return {
    logical,
    provider,
    total,
    failed: (logical.FAILED ?? 0) + (provider.FAILED ?? 0),
    ambiguous: logical.RECONCILIATION_REQUIRED ?? 0,
    // Dispatch writes ACCEPTED; a terminal webhook overwrites it. Rows still
    // reading ACCEPTED are therefore the ones awaiting provider confirmation.
    awaitingProvider: provider.ACCEPTED ?? 0,
    noProviderEvent,
  };
}
