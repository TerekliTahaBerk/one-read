"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const SESSION_KEY = "oneread-opening-loader-shown";
const REVEAL_EVENT = "oneread:reveal";
/** Safety net: reveal anyway if the loader never signals (e.g. it errored). */
const FALLBACK_MS = 5500;

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Coordinates the homepage's gentle staggered reveal with the opening loader.
 *
 * - First visit (loader plays): stays "armed" (hidden) until the loader
 *   dispatches `oneread:reveal` as it fades, then plays the stagger.
 * - Repeat visits where the loader is skipped: reveals immediately on mount
 *   (before paint, so there's no flash).
 * - Reduced motion: content is shown instantly via CSS, no motion.
 *
 * Children are server-rendered and passed through untouched; this only owns the
 * wrapper element and its `data-reveal` state. Without JS the CSS defaults to
 * fully visible, so content is never trapped behind this.
 */
export function HomeReveal({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"idle" | "armed" | "go">("idle");
  const timer = useRef<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // sessionStorage may be unavailable (private mode) — treat as not shown.
    }

    // If the loader won't play this load, reveal right away.
    if (alreadyShown) {
      setState("go");
      return;
    }

    // The loader is expected to play — hide, then reveal when it signals.
    setState("armed");

    const reveal = () => setState("go");
    window.addEventListener(REVEAL_EVENT, reveal, { once: true });
    timer.current = window.setTimeout(reveal, FALLBACK_MS);

    return () => {
      window.removeEventListener(REVEAL_EVENT, reveal);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="reveal-scope contents" data-reveal={state}>
      {children}
    </div>
  );
}
