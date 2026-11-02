"use client";

// The interface language. The server picks it (cookie or browser languages) so the first page is
// already in the right language; switching saves the cookie for a year and re-renders.
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { LOCALE_COOKIE, translator } from "@/lib/i18n";

const LocaleContext = createContext({ locale: "en", t: translator("en"), setLocale: () => {} });

export function LocaleProvider({ initialLocale, children }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);

  const setLocale = useCallback(
    (next) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      setLocaleState(next);
      router.refresh(); // server-rendered pages (About, Privacy, public portfolios) follow too
    },
    [router]
  );

  const value = useMemo(() => ({ locale, setLocale, t: translator(locale) }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);
export const useT = () => useContext(LocaleContext).t;
