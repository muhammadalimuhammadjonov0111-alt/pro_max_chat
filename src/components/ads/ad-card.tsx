"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Megaphone,
  Phone,
  Send,
  Sparkles,
} from "lucide-react";

import { useT } from "@/hooks/use-i18n";
import {
  AD_CONTACT_PHONE,
  AD_CONTACT_TEL,
  type ActiveAd,
} from "@/lib/ads";
import { cn } from "@/lib/utils";
import { AdMedia } from "@/components/ads/ad-media";

const PHONE_HREF = `tel:${AD_CONTACT_TEL}`;

function AdvertiserContact({ ad }: { ad: ActiveAd }) {
  const t = useT();

  if (ad.contactType === "PHONE" && ad.contactValue) {
    return (
      <a
        href={`tel:${ad.contactValue}`}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
      >
        <Phone className="h-3.5 w-3.5 shrink-0" />
        <span dir="ltr" className="tabular-nums">
          {ad.contactValue}
        </span>
      </a>
    );
  }

  if (ad.contactType === "TELEGRAM" && ad.contactValue) {
    const invite = ad.contactValue.startsWith("+");
    return (
      <a
        href={`https://t.me/${ad.contactValue}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/12 px-2.5 py-1 font-semibold text-sky-700 transition-colors hover:bg-sky-500/20 dark:text-sky-300"
      >
        <Send className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[150px] truncate">
          {invite ? t("Telegram") : `@${ad.contactValue}`}
        </span>
      </a>
    );
  }

  return null;
}

/** In-feed advertising slot: header, creative, CTA, then advertiser details. */
export function AdCard({ ad }: { ad: ActiveAd | null }) {
  const t = useT();

  if (!ad) {
    return (
      <article className="card-glow group/ad relative overflow-hidden border-b bg-card/95 sm:rounded-3xl sm:border sm:shadow-sm sm:transition-all sm:duration-300 sm:hover:-translate-y-0.5 sm:hover:shadow-xl">
        <div className="relative flex aspect-[4/5] max-h-[540px] w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400 px-6 text-center text-white">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-black/20 blur-3xl" />

          <span className="absolute start-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset ring-white/25 backdrop-blur-md">
            <Megaphone className="h-3.5 w-3.5" />
            {t("Reklama")}
          </span>

          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/20 ring-1 ring-inset ring-white/30 backdrop-blur-md">
            <Megaphone className="h-7 w-7" />
          </span>
          <h3 className="mt-4 max-w-[16ch] text-balance text-2xl font-black leading-tight tracking-tight drop-shadow-sm sm:text-3xl">
            {t("Bu yerda sizning reklamangiz bo'lishi mumkin")}
          </h3>
          <p className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-white/85">
            {t(
              "Reklamangizni 30 kun davomida ko'rsating. Ma'lumotlar uchun murojaat qiling."
            )}
          </p>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <Link
            href="/ads"
            className="brand-gradient animated-gradient flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,0.9)] transition-transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <Megaphone className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("Reklama joylash")}</span>
          </Link>

          <div className="flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 text-emerald-500" />
            <span>{t("Ma'lumotlar uchun murojaat qiling")}</span>
          </div>

          <a
            href={PHONE_HREF}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border bg-background text-sm font-semibold transition-colors hover:bg-accent"
          >
            <Phone className="h-4 w-4 text-emerald-500" />
            <span dir="ltr" className="tabular-nums">
              {AD_CONTACT_PHONE}
            </span>
          </a>

          <p className="text-center text-[11px] font-medium text-muted-foreground">
            {t("Reklama 30 kun davomida ko'rsatiladi")}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="card-glow group/ad relative overflow-hidden border-b bg-card/95 sm:rounded-3xl sm:border sm:shadow-sm sm:transition-all sm:duration-300 sm:hover:-translate-y-0.5 sm:hover:shadow-xl">
      <header className="flex items-start gap-3 px-4 pb-3 pt-4">
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          <Megaphone className="h-3 w-3" />
          {t("Reklama")}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[17px] font-extrabold leading-snug tracking-tight">
            {ad.title}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {ad.description}
          </p>
        </div>
      </header>

      <div className="relative aspect-[4/5] max-h-[540px] w-full overflow-hidden bg-neutral-950">
        <AdMedia ad={ad} />
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <a
          href={ad.targetUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="brand-gradient animated-gradient flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,0.9)] transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <span className="truncate">{ad.buttonLabel || t("Batafsil")}</span>
          <ArrowUpRight className="h-4 w-4 shrink-0" />
        </a>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
          <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="truncate">
              {t("Reklama egasi")}:{" "}
              <span className="font-semibold text-foreground">@{ad.owner}</span>
            </span>
          </span>
          <AdvertiserContact ad={ad} />
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>{t("Reklama 30 kun davomida ko'rsatiladi")}</span>
          <Link
            href="/ads"
            className="shrink-0 font-semibold transition-colors hover:text-primary"
          >
            {t("Siz ham reklama bering")}
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Full-screen advertising slide used inside the Reels snap feed. */
export function AdReelSlide({ ad }: { ad: ActiveAd | null }) {
  const t = useT();

  return (
    <section className="relative flex h-full snap-start snap-always items-center justify-center px-3 py-3 md:py-6">
      <div
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/10 text-white shadow-[0_40px_120px_-40px_rgba(124,58,237,0.75)] md:h-full md:max-h-[calc(100dvh-3rem)] md:max-w-[430px]",
          ad
            ? "bg-neutral-950"
            : "bg-gradient-to-br from-violet-700 via-fuchsia-600 to-amber-500"
        )}
      >
        {ad ? (
          <>
            <div className="absolute inset-0">
              <AdMedia ad={ad} reel />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/35" />
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-black/25 blur-3xl" />
          </>
        )}

        <div className="relative z-[1] flex h-full flex-col justify-end p-5 pb-6">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ring-1 ring-inset ring-white/25 backdrop-blur-md">
            <Megaphone className="h-3.5 w-3.5" />
            {t("Reklama")}
          </span>

          <h2 className="mt-3 line-clamp-3 text-balance text-3xl font-black leading-[1.1] tracking-tight drop-shadow-sm">
            {ad
              ? ad.title
              : t("Bu yerda sizning reklamangiz bo'lishi mumkin")}
          </h2>
          <p className="mt-2 line-clamp-3 max-w-sm text-sm font-medium leading-relaxed text-white/85">
            {ad
              ? ad.description
              : t(
                  "Reklamangizni 30 kun davomida ko'rsating. Ma'lumotlar uchun murojaat qiling."
                )}
          </p>

          <div className="mt-5 space-y-3">
            {ad ? (
              <a
                href={ad.targetUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-neutral-950 shadow-xl transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <span className="truncate">
                  {ad.buttonLabel || t("Batafsil")}
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0" />
              </a>
            ) : (
              <Link
                href="/ads"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-neutral-950 shadow-xl transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <Megaphone className="h-4 w-4 shrink-0" />
                <span className="truncate">{t("Reklama joylash")}</span>
              </Link>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-3 text-[11px] text-white/85">
              {ad ? (
                <span className="truncate font-semibold">@{ad.owner}</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-300" />
                  {t("Ma'lumotlar uchun murojaat qiling")}
                </span>
              )}
              {ad ? (
                <AdvertiserContact ad={ad} />
              ) : (
                <a
                  href={PHONE_HREF}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-semibold text-white backdrop-blur-md"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span dir="ltr" className="tabular-nums">
                    {AD_CONTACT_PHONE}
                  </span>
                </a>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-white/65">
              <span>{t("Reklama 30 kun davomida ko'rsatiladi")}</span>
              <Link
                href="/ads"
                className="shrink-0 font-semibold text-white/80 underline-offset-2 hover:underline"
              >
                {t("Siz ham reklama bering")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
