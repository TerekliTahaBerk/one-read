/**
 * Generic operational-run tracking, shared by every product's daily pipeline.
 *
 * A run row is opened before work starts (status RUNNING) and closed with the
 * outcome (SUCCESS / FAILED / SKIPPED) plus counts. This is what lets the panel
 * show a real "last run / last success / last error" per product instead of
 * guessing from the send log. On FAILED we also fire a best-effort admin alert
 * so an unattended backend still surfaces problems.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendDailyEmail } from "@/lib/resend";

export interface StartRunInput {
  productKey: string;
  route: string;
  dryRun: boolean;
  requireApproval: boolean;
  metadata?: Prisma.InputJsonValue;
}

export async function startRun(input: StartRunInput) {
  return prisma.operationalRun.create({
    data: {
      productKey: input.productKey,
      route: input.route,
      dryRun: input.dryRun,
      requireApproval: input.requireApproval,
      metadata: input.metadata,
    },
  });
}

export interface FinishRunInput {
  id: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  generatedCount?: number;
  sentCount?: number;
  skippedCount?: number;
  failedCount?: number;
  error?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export async function finishRun(input: FinishRunInput) {
  return prisma.operationalRun.update({
    where: { id: input.id },
    data: {
      status: input.status,
      finishedAt: new Date(),
      generatedCount: input.generatedCount ?? 0,
      sentCount: input.sentCount ?? 0,
      skippedCount: input.skippedCount ?? 0,
      failedCount: input.failedCount ?? 0,
      error: input.error ?? null,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    },
  });
}

export interface RunSnapshot {
  last: { startedAt: Date; status: string; error: string | null } | null;
  lastSuccessAt: Date | null;
  lastFailure: { startedAt: Date; error: string | null } | null;
}

/** Plain label for a raw run status. */
export function runStatusLabel(status: string): string {
  switch (status) {
    case "SUCCESS":
      return "OK";
    case "FAILED":
      return "Failed";
    case "SKIPPED":
      return "Skipped";
    default:
      return "Running";
  }
}

/** Latest / latest-success / latest-failure runs for one product, in one call. */
export async function getRunSnapshot(productKey: string): Promise<RunSnapshot> {
  const [last, success, failed] = await Promise.all([
    prisma.operationalRun.findFirst({
      where: { productKey },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true, status: true, error: true },
    }),
    prisma.operationalRun.findFirst({
      where: { productKey, status: "SUCCESS" },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
    prisma.operationalRun.findFirst({
      where: { productKey, status: "FAILED" },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true, error: true },
    }),
  ]);
  return {
    last: last ?? null,
    lastSuccessAt: success?.startedAt ?? null,
    lastFailure: failed ?? null,
  };
}

/**
 * Best-effort admin alert when a run fails. No-op when ADMIN_EMAIL is unset or
 * email can't be sent; never throws (a failing alert must not mask the real
 * failure, nor break the cron response).
 */
export async function notifyRunFailure(input: {
  productName: string;
  route: string;
  error: string;
}): Promise<void> {
  const to = process.env.ADMIN_EMAIL?.trim();
  if (!to) return;
  const subject = `⚠️ ${input.productName} daily run failed`;
  const text = [
    `${input.productName} automatic run failed.`,
    ``,
    `Route: ${input.route}`,
    `Error: ${input.error}`,
    `Time: ${new Date().toISOString()}`,
    ``,
    `Open the admin panel to review and re-run.`,
  ].join("\n");
  try {
    await sendDailyEmail({ to, subject, text, html: `<pre>${escapeHtml(text)}</pre>` });
  } catch {
    // Swallow — alerting is best-effort.
  }
}

/** Alerts on a logically empty live run even when no exception was thrown. */
export async function notifyZeroDelivery(input: { productName: string; route: string; eligible: number }): Promise<void> {
  if (input.eligible <= 0) return;
  const to = process.env.ADMIN_EMAIL?.trim();
  if (!to) return;
  const text = `${input.productName} completed with ${input.eligible} eligible subscriber(s), but delivered 0 emails.\n\nRoute: ${input.route}\nTime: ${new Date().toISOString()}\n\nReview approvals, generated content, provider errors, and send logs.`;
  try {
    await sendDailyEmail({ to, subject: `⚠️ ${input.productName}: zero deliveries`, text, html: `<pre>${escapeHtml(text)}</pre>` });
  } catch { /* best effort */ }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
