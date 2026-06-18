import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Appends one row to the admin audit log. Best-effort: a logging failure must
 * never block or reverse the action that already succeeded, so errors are
 * swallowed (and surfaced to the server console) rather than thrown.
 */
export async function recordAudit(input: {
  actor: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actor: input.actor,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        metadata: input.metadata,
      },
    });
  } catch (err) {
    console.error("[admin/audit] failed to record:", input.action, err);
  }
}
