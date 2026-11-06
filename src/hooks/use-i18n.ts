"use client";

import { useI18n } from "@/components/providers/i18n-provider";

/** Returns the current locale, a bound `t()` function and `setLocale()`. */
export function useT() {
  return useI18n().t;
}

/** Returns the current locale and helpers. */
export { useI18n };
