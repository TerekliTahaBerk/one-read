import { type SVGProps } from "react";

/**
 * MorningIcon — a hand-drawn sunrise rising over the edge of a page.
 * Built entirely from inline SVG primitives so no external assets are needed.
 */
export function MorningIcon({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 96 96"
      width="76"
      height="76"
      role="img"
      aria-label="A small sun rising over the edge of a page"
      fill="none"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient
          id="oneread-sun"
          x1="48"
          y1="28"
          x2="48"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#F2D8A8" />
          <stop offset="1" stopColor="#C97A2C" />
        </linearGradient>
        <radialGradient
          id="oneread-halo"
          cx="48"
          cy="46"
          r="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#F2D8A8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#F2D8A8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft halo behind the sun */}
      <circle cx="48" cy="46" r="22" fill="url(#oneread-halo)" />

      {/* Delicate rays */}
      <g
        stroke="#C97A2C"
        strokeWidth="1.25"
        strokeLinecap="round"
        className="animate-ray-pulse"
      >
        <line x1="48" y1="8" x2="48" y2="15" opacity="0.85" />
        <line x1="22" y1="18" x2="26.5" y2="22.5" opacity="0.7" />
        <line x1="74" y1="18" x2="69.5" y2="22.5" opacity="0.7" />
        <line x1="10" y1="42" x2="16" y2="42" opacity="0.55" />
        <line x1="86" y1="42" x2="80" y2="42" opacity="0.55" />
      </g>

      {/* Sun, partially rising behind the horizon */}
      <circle cx="48" cy="46" r="13" fill="url(#oneread-sun)" />

      {/* Horizon — the top edge of the page */}
      <line
        x1="10"
        y1="58"
        x2="86"
        y2="58"
        stroke="#1B1612"
        strokeWidth="1.25"
        strokeLinecap="round"
      />

      {/* Whisper of text on the page below the horizon */}
      <line
        x1="20"
        y1="68"
        x2="76"
        y2="68"
        stroke="#9C8F7E"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
      <line
        x1="26"
        y1="76"
        x2="70"
        y2="76"
        stroke="#9C8F7E"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.42"
      />
      <line
        x1="32"
        y1="84"
        x2="64"
        y2="84"
        stroke="#9C8F7E"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.28"
      />
    </svg>
  );
}
