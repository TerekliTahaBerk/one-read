"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGE_NAMES, SITE_LOCALES } from "@/lib/site-i18n";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";

export function LanguageSwitcher() {
  const { locale, setLocale, dictionary } = useSiteLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={dictionary.language.menu}
        onClick={() => setOpen((value) => !value)}
        className="focus-ring link-underline inline-flex items-center gap-1 rounded-sm transition-colors duration-200 hover:text-ink"
      >
        <span>{LANGUAGE_NAMES[locale]}</span>
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="m2.5 3.75 2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={dictionary.language.menu}
          className="absolute bottom-full right-0 z-50 mb-2 min-w-[8.5rem] overflow-hidden rounded-xl border border-line bg-white p-1.5 text-left shadow-[0_12px_32px_rgba(27,22,18,0.12)] sm:bottom-0 sm:left-full sm:right-auto sm:top-auto sm:mb-0 sm:ml-3"
        >
          {SITE_LOCALES.map((item) => (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={item === locale}
              onClick={() => {
                setLocale(item);
                setOpen(false);
              }}
              className={`focus-ring flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12.5px] transition-colors hover:bg-cream/70 ${item === locale ? "text-ink" : "text-ash"}`}
            >
              <span>{LANGUAGE_NAMES[item]}</span>
              {item === locale && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
