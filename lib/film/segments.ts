import type { FilmPreferences } from "@prisma/client";

/**
 * A film segment groups subscribers who can share the same daily note. To
 * control generation cost we group by (emailLanguage, genre cluster, mood
 * cluster, spoiler preference) — never one note per user.
 */
export interface FilmSegment {
  emailLanguage: string;
  genres: string[];
  moods: string[];
  spoilerPreference: string;
}

const SEP = "__";

function token(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/** Coarse cluster: top 2 sorted genres / moods to keep segments few. */
function cluster(values: string[], take: number): string[] {
  return [...values].sort().slice(0, take);
}

export function segmentFor(prefs: FilmPreferences): FilmSegment {
  return {
    emailLanguage: prefs.emailLanguage,
    genres: cluster(prefs.preferredGenres, 2),
    moods: cluster(prefs.moods, 2),
    spoilerPreference: prefs.spoilerPreference,
  };
}

/** e.g. "en__drama-thriller__quiet-thoughtful__spoiler-light". */
export function segmentKeyForSegment(seg: FilmSegment): string {
  const lang = seg.emailLanguage === "Turkish" ? "tr" : "en";
  const genres = seg.genres.length ? seg.genres.map(token).join("-") : "any";
  const moods = seg.moods.length ? seg.moods.map(token).join("-") : "any";
  return [lang, genres, moods, token(seg.spoilerPreference)].join(SEP);
}

export function segmentKeyFor(prefs: FilmPreferences): string {
  return segmentKeyForSegment(segmentFor(prefs));
}

export function segmentLabel(seg: FilmSegment): string {
  const genres = seg.genres.length ? seg.genres.join(", ") : "Any genre";
  const moods = seg.moods.length ? seg.moods.join(", ") : "Any mood";
  return `${seg.emailLanguage} · ${genres} · ${moods} · ${seg.spoilerPreference}`;
}
