import { DEFAULT_LOCALE, type Locale } from "./config";
import ar from "./messages/ar";
import de from "./messages/de";
import en from "./messages/en";
import enAdmin from "./messages/en.admin";
import enBots from "./messages/en.bots";
import enChat from "./messages/en.chat";
import enFeed from "./messages/en.feed";
import es from "./messages/es";
import fr from "./messages/fr";
import hi from "./messages/hi";
import id from "./messages/id";
import it from "./messages/it";
import ja from "./messages/ja";
import ko from "./messages/ko";
import pt from "./messages/pt";
import ru from "./messages/ru";
import ruAdmin from "./messages/ru.admin";
import ruBots from "./messages/ru.bots";
import ruChat from "./messages/ru.chat";
import ruFeed from "./messages/ru.feed";
import tr from "./messages/tr";
import vi from "./messages/vi";
import zh from "./messages/zh";
import zhAdmin from "./messages/zh.admin";
import zhBots from "./messages/zh.bots";
import zhChat from "./messages/zh.chat";
import zhFeed from "./messages/zh.feed";

export * from "./config";

export type Dictionary = Record<string, string>;
export type TranslateVars = Record<string, string | number>;
export type TranslateFn = (key: string, vars?: TranslateVars) => string;

/**
 * Normalises text so that straight and typographic apostrophes/quotes, and
 * non-breaking spaces, compare as equal. Components mix `'` and `'` (from
 * `&apos;`), so keys must be matched loosely.
 */
function normalize(value: string): string {
  return value
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
    .replace(/[\u201c\u201d\u2033]/g, '"')
    .replace(/\u00a0/g, " ")
    .trim();
}

function buildIndex(dict: Dictionary): Dictionary {
  const index: Dictionary = {};
  for (const [key, value] of Object.entries(dict)) {
    index[normalize(key)] = value;
  }
  return index;
}

function merge(...parts: Dictionary[]): Dictionary {
  return Object.assign({}, ...parts);
}

const DICTIONARIES: Record<Locale, Dictionary> = {
  uz: buildIndex({}),
  ru: buildIndex(merge(ru, ruFeed, ruChat, ruBots, ruAdmin)),
  en: buildIndex(merge(en, enFeed, enChat, enBots, enAdmin)),
  zh: buildIndex(merge(zh, zhFeed, zhChat, zhBots, zhAdmin)),
  es: buildIndex(es),
  fr: buildIndex(fr),
  de: buildIndex(de),
  pt: buildIndex(pt),
  it: buildIndex(it),
  tr: buildIndex(tr),
  ar: buildIndex(ar),
  hi: buildIndex(hi),
  id: buildIndex(id),
  ja: buildIndex(ja),
  ko: buildIndex(ko),
  vi: buildIndex(vi),
};

/** Translate a single string. Falls back to the key itself (Uzbek source). */
export function translate(
  locale: Locale,
  key: string,
  vars?: TranslateVars
): string {
  const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  let value = dict[normalize(key)] ?? key;
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.split(`{${name}}`).join(String(replacement));
    }
  }
  return value;
}

/** Creates a `t()` function bound to a locale. */
export function createT(locale: Locale): TranslateFn {
  return (key, vars) => translate(locale, key, vars);
}
