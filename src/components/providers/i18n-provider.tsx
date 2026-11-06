"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  LOCALES,
  LOCALE_COOKIE,
  createT,
  isRtl,
  type Locale,
  type TranslateFn,
} from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  t: TranslateFn;
  setLocale: (locale: Locale) => void;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  // Keep in sync if the server-provided locale changes (e.g. after refresh).
  // Adjusting state during render is React's recommended prop-sync pattern and
  // avoids an extra effect pass.
  if (initialLocale !== locale) {
    setLocaleState(initialLocale);
  }

  const setLocale = React.useCallback(
    (next: Locale) => {
      if (!(LOCALES as readonly string[]).includes(next)) return;
      document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
      document.documentElement.lang = next;
      document.documentElement.dir = isRtl(next) ? "rtl" : "ltr";
      setLocaleState(next);
      router.refresh();
    },
    [router]
  );

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, t: createT(locale), setLocale }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
