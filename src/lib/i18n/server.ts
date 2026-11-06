import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  createT,
  isLocale,
  type Locale,
  type TranslateFn,
} from "./index";

/** Reads the visitor's locale from the cookie. Server-only. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Returns a `t()` function bound to the visitor's locale. Server-only. */
export async function getT(): Promise<TranslateFn> {
  return createT(await getLocale());
}
