import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Renders a real SVG flag instead of an emoji.
 *
 * Windows (and some Linux setups) have no flag emoji glyphs and would show
 * two-letter pairs such as "DE" or "UZ" in the language picker, which looks
 * broken. Bundled SVGs render identically on every platform.
 */
export function LocaleFlag({
  code,
  className,
}: {
  code: Locale;
  className?: string;
}) {
  const country = LOCALE_META[code]?.country ?? code;

  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-[15px] w-5 shrink-0 rounded-[3px] bg-cover bg-center shadow-[0_0_0_1px_rgba(0,0,0,0.08)]",
        className
      )}
      style={{ backgroundImage: `url(/locale-flags/${country}.svg)` }}
    />
  );
}
