import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SENSITIVE_KEY = /(secret|token|password|authorization|cookie|key|signature)/i;

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

export type AuditFilters = {
  action?: string;
  targetType?: string;
  q?: string;
  date?: string;
};

export async function loadAuditLogs(filters: AuditFilters = {}, take = 100) {
  const where: Prisma.AdminAuditLogWhereInput = {};
  if (filters.action) where.action = { contains: filters.action, mode: "insensitive" };
  if (filters.targetType) where.targetType = filters.targetType;
  if (filters.q) {
    where.OR = [
      { actor: { contains: filters.q, mode: "insensitive" } },
      { action: { contains: filters.q, mode: "insensitive" } },
      { targetType: { contains: filters.q, mode: "insensitive" } },
      { targetId: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.date) {
    const start = new Date(`${filters.date}T00:00:00Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    where.createdAt = { gte: start, lt: end };
  }

  return prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function summarizeAuditMetadata(metadata: Prisma.JsonValue | null): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "No metadata";

  const parts: string[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY.test(key)) {
      parts.push(`${key}: redacted`);
      continue;
    }
    if (value == null || value === "") continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      parts.push(`${key}: ${String(value).slice(0, 80)}`);
      continue;
    }
    if (Array.isArray(value)) {
      parts.push(`${key}: ${value.length} item${value.length === 1 ? "" : "s"}`);
      continue;
    }
    parts.push(`${key}: object`);
  }

  return parts.length ? parts.join(" · ") : "No metadata";
}
