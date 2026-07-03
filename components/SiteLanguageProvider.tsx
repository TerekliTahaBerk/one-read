"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  SITE_DICTIONARIES,
  SITE_LOCALE_COOKIE,
  type SiteLocale,
} from "@/lib/site-i18n";

type LanguageContextValue = {
  locale: SiteLocale;
  setLocale: (locale: SiteLocale) => void;
  dictionary: (typeof SITE_DICTIONARIES)[SiteLocale];
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function SiteLanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: SiteLocale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<SiteLocale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    dictionary: SITE_DICTIONARIES[locale],
    setLocale(nextLocale) {
      setLocaleState(nextLocale);
      document.cookie = `${SITE_LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
      document.documentElement.lang = nextLocale;
    },
  }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useSiteLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useSiteLanguage must be used within SiteLanguageProvider");
  return value;
}
