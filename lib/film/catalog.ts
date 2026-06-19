import type { FilmCatalogEntry } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { FilmSegment } from "./segments";

/**
 * OneFilm catalog access. OneFilm commentary is original, but factual film
 * metadata must be grounded — it comes only from admin-curated FilmCatalogEntry
 * rows (or a verified provider). When no entry fits a segment, callers must
 * show a clear "no film" state and never invent a film.
 */

/**
 * Picks a catalog film for a segment. Prefers an unused entry that overlaps the
 * segment's genres / spoiler level; falls back to any unused entry, then to the
 * least-recently-used one. Returns null only when the catalog is empty.
 */
export async function pickFilmForSegment(
  seg: FilmSegment,
): Promise<FilmCatalogEntry | null> {
  const entries = await prisma.filmCatalogEntry.findMany({
    orderBy: [{ usedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
    take: 50,
  });
  if (entries.length === 0) return null;

  const wantGenres = new Set(seg.genres.map((g) => g.toLowerCase()));
  const scored = entries
    .map((e) => {
      let score = 0;
      if (!e.usedAt) score += 2;
      if (wantGenres.size > 0 && e.genres.some((g) => wantGenres.has(g.toLowerCase()))) score += 3;
      if (seg.spoilerPreference && e.spoilerLevel === toSpoilerLevel(seg.spoilerPreference)) score += 1;
      return { e, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.e ?? null;
}

function toSpoilerLevel(pref: string): string {
  switch (pref) {
    case "Spoiler-free":
      return "spoiler-free";
    case "Full analysis allowed":
      return "full";
    default:
      return "spoiler-light";
  }
}

export async function markFilmUsed(id: string): Promise<void> {
  await prisma.filmCatalogEntry.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export interface CatalogEntryInput {
  title: string;
  year?: number | null;
  director?: string | null;
  filmLanguage?: string | null;
  runtimeMinutes?: number | null;
  sourceUrl?: string | null;
  adminNote?: string | null;
  genres: string[];
  moods: string[];
  spoilerLevel: string;
  createdBy?: string | null;
}

export async function addCatalogEntry(
  input: CatalogEntryInput,
): Promise<FilmCatalogEntry> {
  return prisma.filmCatalogEntry.create({ data: { ...input } });
}
