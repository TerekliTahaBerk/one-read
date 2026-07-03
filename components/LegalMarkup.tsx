import { Fragment, type ReactNode } from "react";

/**
 * Tiny inline markup for legal copy: **bold** and [text](url). Content is
 * static and authored in lib/legal-i18n.ts, not user input.
 */
const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

export function renderInline(text: string): ReactNode {
  const parts = text.split(INLINE_PATTERN).filter((part) => part !== "");

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      return (
        <a key={index} href={href}>
          {label}
        </a>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}
