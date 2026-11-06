"use client";

import { Check, Globe } from "lucide-react";

import { useI18n } from "@/hooks/use-i18n";
import { LOCALES, LOCALE_META } from "@/lib/i18n";
import { LocaleFlag } from "@/components/shared/locale-flag";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Language picker. Persists the choice in a cookie and refreshes server
 * components so the whole app switches language.
 */
export function LanguageSwitcher({
  align = "end",
  side = "bottom",
  compact = false,
  className,
}: {
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  compact?: boolean;
  className?: string;
}) {
  const { locale, setLocale, t } = useI18n();
  const current = LOCALE_META[locale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-xl border bg-background/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
            className
          )}
          aria-label={t("Tilni tanlang")}
        >
          <Globe className="h-4 w-4 text-muted-foreground" />
          <LocaleFlag code={locale} />
          {!compact && <span className="max-w-[8.5rem] truncate">{current.native}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        className="max-h-[min(70vh,26rem)] w-56 overflow-y-auto p-1.5"
      >
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          {t("Tilni tanlang")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((code) => {
          const meta = LOCALE_META[code];
          const active = code === locale;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => setLocale(code)}
              className="flex items-center gap-3"
            >
              <LocaleFlag code={code} />
              <span className="min-w-0 flex-1 truncate">{meta.native}</span>
              {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
