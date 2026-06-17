"use client";

import {
  type CSSProperties,
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
 * is ever typed or deleted — `One` stays fixed. Colors come straight from the
 * existing product theme tokens so the loader can't drift from the brand.
 */
type ColorKey = "read" | "article" | "lingo" | "goal" | "plate" | "move";

const SEQUENCE = [
  { suffix: "Read", color: "read" },
  { suffix: "Article", color: "article" },
  { suffix: "Lingo", color: "lingo" },
  { suffix: "Goal", color: "goal" },
  { suffix: "Plate", color: "plate" },
  { suffix: "Move", color: "move" },
  { suffix: "Read", color: "read" },
] as const satisfies ReadonlyArray<{ suffix: string; color: ColorKey }>;

const ORBIT_ITEMS: {
  label: string;
  color: Exclude<ColorKey, "read">;
  x: number;
  y: number;
}[] = [
  { label: "Article", color: "article", x: 0, y: -86 },
  { label: "Lingo", color: "lingo", x: 96, y: -28 },
  { label: "Goal", color: "goal", x: 60, y: 76 },
  { label: "Plate", color: "plate", x: -60, y: 76 },
  { label: "Move", color: "move", x: -96, y: -28 },
];

type LoaderOrbitStyle = CSSProperties & {
  "--orbit-x": string;
  "--orbit-y": string;
  "--orbit-start-x": string;
  "--orbit-start-y": string;
  "--orbit-peak-x": string;
  "--orbit-peak-y": string;
  "--orbit-settle-x": string;
  "--orbit-settle-y": string;
  "--orbit-color": string;
};

const SUFFIX_COLORS: Record<ColorKey, string> = {
  // `Read` stays neutral/dark; the rest use each product's own accent.
  read: "#1A1A1A",
  article: productThemes.article.accent,
  lingo: productThemes.lingo.accent,
  goal: productThemes.goal.accent,
  plate: productThemes.plate.accent,
  move: productThemes.move.accent,
};

/** Only these public, top-of-funnel pages get the opening animation. */
const PUBLIC_PATHS = new Set([
  "/",
  "/article",
  "/article/pricing",
  "/article/subscribe",
]);

const SESSION_KEY = "oneread-opening-loader-shown";

/* Timing (ms) — tuned to keep the full sequence around ~4.3s. */
const TYPE_MS = 48;
const DELETE_MS = 30;
const PAUSE_MS = 220;
const FINAL_HOLD_MS = 300;
const CLOSING_MS = 850;
const FADE_MS = 450;
const REDUCED_HOLD_MS = 650;

type Frame = { suffix: string; color: ColorKey; hold: number };

/** Expand the sequence into per-character typewriter frames. */
function buildFrames(): Frame[] {
  const [first, ...rest] = SEQUENCE;
  const frames: Frame[] = [
    { suffix: first.suffix, color: first.color, hold: PAUSE_MS },
  ];

  rest.forEach(({ suffix, color }, index) => {
    const previous = SEQUENCE[index];
    const isLast = index === rest.length - 1;

    // Delete the previous suffix back down to `One`.
    for (let i = previous.suffix.length - 1; i >= 0; i -= 1) {
      frames.push({
        suffix: previous.suffix.slice(0, i),
        color: previous.color,
        hold: DELETE_MS,
      });
    }

    // Type the next suffix in, one character at a time.
    for (let i = 1; i <= suffix.length; i += 1) {
      frames.push({ suffix: suffix.slice(0, i), color, hold: TYPE_MS });
    }
    frames[frames.length - 1].hold = isLast ? FINAL_HOLD_MS : PAUSE_MS;
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
  const [closing, setClosing] = useState(false);
  const [suffix, setSuffix] = useState("Read");
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

    const startClosing = () => {
      setClosing(true);
      setSuffix("Read");
      setColor("read");
      const id = window.setTimeout(startFadeOut, CLOSING_MS);
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
        startClosing();
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
      <div className="relative flex h-44 w-72 items-center justify-center sm:h-56 sm:w-[28rem]">
        {closing &&
          ORBIT_ITEMS.map((item) => (
            <span
              key={item.label}
              className="loader-orbit-item"
              style={
                {
                  "--orbit-x": `${item.x}px`,
                  "--orbit-y": `${item.y}px`,
                  "--orbit-start-x": `${item.x * 0.72}px`,
                  "--orbit-start-y": `${item.y * 0.72}px`,
                  "--orbit-peak-x": `${item.x * 1.02 + 4}px`,
                  "--orbit-peak-y": `${item.y * 1.02 - 2}px`,
                  "--orbit-settle-x": `${item.x * 0.94 - 3}px`,
                  "--orbit-settle-y": `${item.y * 0.94 + 2}px`,
                  "--orbit-color": SUFFIX_COLORS[item.color],
                } as LoaderOrbitStyle
              }
            >
              <span className="loader-orbit-dot" />
              <span className="loader-orbit-label">{item.label}</span>
            </span>
          ))}
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
              opacity: closing ? 0 : undefined,
              color: SUFFIX_COLORS[color],
              fontWeight: 300,
              marginLeft: "0.04em",
            }}
          >
            |
          </span>
        </span>
      </div>
    </div>
  );
}
