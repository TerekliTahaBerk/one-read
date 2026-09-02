"use client";

import { useEffect, useRef } from "react";
import { trackEvent, type AnalyticsEvent, type AnalyticsProperties } from "@/lib/analytics";

/**
 * Fires one product-analytics event when a server-rendered page first appears.
 *
 * Used where the meaningful moment is the render itself (a sample being read,
 * an unsubscribe having completed) rather than a click, so the surrounding page
 * can stay a server component with no client-side behaviour of its own.
 */
export function TrackEventOnMount({
  event,
  properties,
}: {
  event: AnalyticsEvent;
  properties?: AnalyticsProperties;
}) {
  const fired = useRef(false);

  useEffect(() => {
    // Guarded so React's development double-invoke cannot double count.
    if (fired.current) return;
    fired.current = true;
    trackEvent(event, properties);
  }, [event, properties]);

  return null;
}
