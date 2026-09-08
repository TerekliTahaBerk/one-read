/**
 * Admin view over the RSS `Source` table.
 *
 * Ingestion reads `Source` rows where `active` is true — but only if the table
 * has any usable row at all; otherwise it silently falls back to the seed list
 * compiled into the app. That fallback is invisible from the database, so the
 * admin screen has to state it, or an operator staring at an empty table would
 * conclude nothing is being ingested while the seed feeds keep running.
 */

import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/admin/audit";
import { BLOCKED_SOURCE_SLUGS } from "@/lib/rss-source";
import { ACTIVE_SEED_SOURCES } from "@/lib/sources";

/** Articles newer than this count towards the "recent" ingest figure. */
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface AdminSourceRow {
  id: string;
  slug: string;
  name: string;
  feedUrl: string;
  homepage: string | null;
  defaultTopic: string;
  language: string;
  active: boolean;
  /** True when this feed is disabled in code regardless of the `active` flag. */
  blockedInCode: boolean;
  notes: string | null;
  lastFetchedAt: Date | null;
  lastError: string | null;
  /** Articles ingested from this source in the last seven days. */
  recentArticles: number;
  /** Articles ever ingested from this source. */
  totalArticles: number;
}

export interface AdminSourceOverview {
  rows: AdminSourceRow[];
  /** True when ingestion is running off the built-in seed list, not this table. */
  usingSeedFallback: boolean;
  seedSourceCount: number;
  activeCount: number;
  erroringCount: number;
  /** Sources that have never reported a successful or failed fetch. */
  neverFetchedCount: number;
}

export async function loadSourceOverview(): Promise<AdminSourceOverview> {
  const since = new Date(Date.now() - RECENT_WINDOW_MS);
  const [sources, totals, recent] = await Promise.all([
    prisma.source.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.article.groupBy({ by: ["sourceName"], _count: { _all: true } }),
    prisma.article.groupBy({
      by: ["sourceName"],
      where: { ingestedAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  // Articles record the source's display name, not its slug, so that is the
  // only key available to join on.
  const totalByName = new Map(totals.map((r) => [r.sourceName, r._count._all]));
  const recentByName = new Map(recent.map((r) => [r.sourceName, r._count._all]));

  const rows: AdminSourceRow[] = sources.map((source) => ({
    id: source.id,
    slug: source.slug,
    name: source.name,
    feedUrl: source.feedUrl,
    homepage: source.homepage,
    defaultTopic: source.defaultTopic,
    language: source.language,
    active: source.active,
    blockedInCode: BLOCKED_SOURCE_SLUGS.has(source.slug),
    notes: source.notes,
    lastFetchedAt: source.lastFetchedAt,
    lastError: source.lastError,
    recentArticles: recentByName.get(source.name) ?? 0,
    totalArticles: totalByName.get(source.name) ?? 0,
  }));

  // Mirrors `loadEnabledSources`: an empty usable set is what triggers the
  // seed fallback, so the same condition is evaluated here.
  const usable = rows.filter((row) => row.active && !row.blockedInCode);

  return {
    rows,
    usingSeedFallback: usable.length === 0,
    seedSourceCount: ACTIVE_SEED_SOURCES.filter((s) => !BLOCKED_SOURCE_SLUGS.has(s.slug)).length,
    activeCount: usable.length,
    erroringCount: rows.filter((row) => Boolean(row.lastError)).length,
    neverFetchedCount: rows.filter((row) => row.lastFetchedAt === null).length,
  };
}

/**
 * Enable or disable one feed. Blocked-in-code sources may not be enabled from
 * the panel: ingestion would ignore the flag anyway, and a toggle that appears
 * to work but does nothing is exactly the failure this audit was about.
 */
export async function setSourceActive(
  slug: string,
  active: boolean,
  actor: string,
): Promise<void> {
  if (active && BLOCKED_SOURCE_SLUGS.has(slug)) throw new Error("source_blocked_in_code");
  const updated = await prisma.source.updateMany({ where: { slug }, data: { active } });
  if (updated.count === 0) throw new Error("source_not_found");
  await recordAudit({
    actor,
    action: active ? "source.enable" : "source.disable",
    targetType: "Source",
    targetId: slug,
    metadata: { active },
  });
}

/**
 * Clear a stored fetch error after an operator has looked at it. Does not retry
 * anything — the next ingest run rewrites the field either way.
 */
export async function clearSourceError(slug: string, actor: string): Promise<void> {
  const updated = await prisma.source.updateMany({ where: { slug }, data: { lastError: null } });
  if (updated.count === 0) throw new Error("source_not_found");
  await recordAudit({
    actor,
    action: "source.clearError",
    targetType: "Source",
    targetId: slug,
    metadata: {},
  });
}
