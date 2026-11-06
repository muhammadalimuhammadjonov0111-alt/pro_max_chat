/**
 * Gidgogram i18n configuration.
 *
 * Uzbek (`uz`) is the source language and the default. Translations live next
 * to this file in `./messages/*.ts` and use the Uzbek string itself as the
 * lookup key, so any string that has not been translated yet gracefully falls
 * back to Uzbek.
 *
 * The app ships with the languages people use most on Instagram: the four
 * original ones (uz/ru/en/zh) plus the twelve most widely used locales.
 */

export const LOCALES = [
  "uz",
  "ru",
  "en",
  "zh",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "tr",
  "ar",
  "hi",
  "id",
  "ja",
  "ko",
  "vi",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";

/** Cookie that stores the visitor's chosen language. */
export const LOCALE_COOKIE = "gidgogram_locale";

/** Locales written right-to-left. */
export const RTL_LOCALES: readonly Locale[] = ["ar"];

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function localeDir(locale: Locale): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr";
}

export const LOCALE_META: Record<
  Locale,
  { label: string; native: string; country: string }
> = {
  uz: { label: "O'zbekcha", native: "O'zbekcha", country: "uz" },
  ru: { label: "Ruscha", native: "Русский", country: "ru" },
  en: { label: "Inglizcha", native: "English", country: "gb" },
  zh: { label: "Xitoycha", native: "中文", country: "cn" },
  es: { label: "Ispancha", native: "Español", country: "es" },
  fr: { label: "Fransuzcha", native: "Français", country: "fr" },
  de: { label: "Nemischa", native: "Deutsch", country: "de" },
  pt: { label: "Portugalcha", native: "Português", country: "pt" },
  it: { label: "Italyancha", native: "Italiano", country: "it" },
  tr: { label: "Turkcha", native: "Türkçe", country: "tr" },
  ar: { label: "Arabcha", native: "العربية", country: "sa" },
  hi: { label: "Hindcha", native: "हिन्दी", country: "in" },
  id: { label: "Indonezcha", native: "Bahasa Indonesia", country: "id" },
  ja: { label: "Yaponcha", native: "日本語", country: "jp" },
  ko: { label: "Koreyscha", native: "한국어", country: "kr" },
  vi: { label: "Vetnamcha", native: "Tiếng Việt", country: "vn" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Legacy/alternative language tags that map onto a supported locale. */
const LOCALE_ALIASES: Record<string, Locale> = {
  in: "id",
  "zh-hans": "zh",
  "zh-hant": "zh",
  "zh-cn": "zh",
  "zh-tw": "zh",
  "zh-hk": "zh",
  "es-419": "es",
  "pt-br": "pt",
  nb: "en",
  nn: "en",
};

/** Best-effort resolution of an arbitrary string to a supported locale. */
export function resolveLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE;
  const lower = value.toLowerCase();
  if (isLocale(lower)) return lower;
  if (LOCALE_ALIASES[lower]) return LOCALE_ALIASES[lower];
  const base = lower.split(/[-_]/)[0];
  if (isLocale(base)) return base;
  if (LOCALE_ALIASES[base]) return LOCALE_ALIASES[base];
  return DEFAULT_LOCALE;
}
