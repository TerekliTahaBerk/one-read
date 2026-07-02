"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { productThemes } from "@/lib/product-themes";

/* ----------------------------------------------------------------------- */
/* Configuration                                                           */
/* ----------------------------------------------------------------------- */

/**
 * The brand wordmark always reads `One` + a changing suffix. Only the suffix
 * is ever typed or deleted — `One` stays fixed. The public site currently
 * introduces OneRead, OneArticle, and OneFilm — the products in the OneRead
 * family visible today. Still-hidden product names stay out of the opening
 * animation.
 */
type ColorKey = "read" | "article" | "film";

const SEQUENCE: { suffix: string; color: ColorKey }[] = [
  { suffix: "Read", color: "read" },
  { suffix: "Article", color: "article" },
  { suffix: "Film", color: "film" },
];

const SUFFIX_COLORS: Record<ColorKey, string> = {
  read: "#1A1A1A",
  article: productThemes.article.accent,
  film: productThemes.film.accent,
};

/** Only these public, top-of-funnel pages get the opening animation. */
const PUBLIC_PATHS = new Set([
  "/",
  "/article",
  "/article/pricing",
  "/article/subscribe",
  "/film",
  "/film/pricing",
  "/pricing",
  "/subscribe",
]);

const SESSION_KEY = "oneread-opening-loader-shown";

/* Timing (ms) — subtle brand-to-product reveal. */
const TYPE_MS = 55;
const DELETE_MS = 34;
const PAUSE_MS = 300;
const FINAL_HOLD_MS = 750;
const FADE_MS = 600;
const REDUCED_HOLD_MS = 650;

type Frame = { suffix: string; color: ColorKey; hold: number };

/** Expand the sequence into per-character typewriter frames. */
function buildFrames(): Frame[] {
  const frames: Frame[] = [];

  SEQUENCE.forEach(({ suffix, color }, index) => {
    const isLast = index === SEQUENCE.length - 1;

    // Type the suffix in, one character at a time.
    for (let i = 1; i <= suffix.length; i += 1) {
      frames.push({ suffix: suffix.slice(0, i), color, hold: TYPE_MS });
    }
    // Hold on the fully-typed word.
    frames[frames.length - 1].hold = isLast ? FINAL_HOLD_MS : PAUSE_MS;

    // Delete the suffix back down to `One` before typing the next public word.
    if (!isLast) {
      for (let i = suffix.length - 1; i >= 0; i -= 1) {
        frames.push({ suffix: suffix.slice(0, i), color, hold: DELETE_MS });
      }
    }
  });

  return frames;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ----------------------------------------------------------------------- */
/* Component                                                               */
/* ----------------------------------------------------------------------- */

export function OpeningLoader() {
  const pathname = usePathname();

  // Render nothing on the server and on the first client paint; the layout
  // effect below decides synchronously (before paint) whether to reveal the
  // overlay, so there's no homepage flash and no hydration mismatch.
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [suffix, setSuffix] = useState("");
  const [color, setColor] = useState<ColorKey>("read");

  const timers = useRef<number[]>([]);

  useIsomorphicLayoutEffect(() => {
    const clearTimers = () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };

    // Skip on non-marketing routes (admin, legal, checkout return, etc.).
    if (!PUBLIC_PATHS.has(pathname)) return;

    // Only once per session — but it's fine to replay on a full refresh of a
    // brand-new session.
    let alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // sessionStorage can throw in private modes; just fall through.
    }
    if (alreadyShown) return;

    setVisible(true);

    const startFadeOut = () => {
      // Mark as shown only once the animation actually completes. Doing this at
      // the end (rather than the start) keeps the effect resilient to React
      // Strict Mode's mount→cleanup→mount double-invoke in development.
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Non-fatal — the loader just may replay if storage is unavailable.
      }
      // Cue any page-level reveal (e.g. the homepage) to begin as we fade, so
      // the handoff feels like one smooth motion rather than a hard cut.
      window.dispatchEvent(new Event("oneread:reveal"));
      setFading(true);
      const id = window.setTimeout(() => setVisible(false), FADE_MS);
      timers.current.push(id);
    };

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      // Show a brief static brand mark, then fade — no typewriter motion.
      setSuffix("Read");
      setColor("read");
      const id = window.setTimeout(startFadeOut, REDUCED_HOLD_MS);
      timers.current.push(id);
      return clearTimers;
    }

    const frames = buildFrames();
    const play = (i: number) => {
      if (i >= frames.length) {
        startFadeOut();
        return;
      }
      const frame = frames[i];
      setSuffix(frame.suffix);
      setColor(frame.color);
      const id = window.setTimeout(() => play(i + 1), frame.hold);
      timers.current.push(id);
    };
    play(0);

    return clearTimers;
    // Intentionally runs once on mount; pathname is read for the initial gate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white"
      style={{
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        // Don't intercept pointer input — keyboard/focus reach the page below.
        pointerEvents: "none",
      }}
    >
      <span
        className="
          font-serif font-medium
          text-[2.6rem] sm:text-[3.4rem]
          leading-none tracking-[-0.02em]
          select-none
          [font-optical-sizing:auto]
        "
      >
        <span style={{ color: "#1A1A1A" }}>One</span>
        <span style={{ color: SUFFIX_COLORS[color] }}>{suffix}</span>
        <span
          className="loader-caret"
          style={{
            color: SUFFIX_COLORS[color],
            fontWeight: 300,
            marginLeft: "0.04em",
          }}
        >
          |
        </span>
      </span>
    </div>
  );
}
