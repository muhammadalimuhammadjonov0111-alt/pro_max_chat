import Link from "next/link";
import { ArrowLeft, Bot, Clock3, Sparkles, Wrench } from "lucide-react";

import { getT } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";

export async function BotsMaintenance() {
  const t = await getT();

  return (
    <div className="px-4 pb-24 sm:px-0 sm:pb-8 sm:pt-4">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-[0_30px_90px_-40px_rgba(79,70,229,0.9)] sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_45%)]" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200 ring-1 ring-inset ring-amber-300/25 backdrop-blur">
            <Wrench className="h-3.5 w-3.5" />
            {t("Texnik ishlar")}
          </span>

          <h1 className="mt-4 text-balance text-2xl font-black leading-tight tracking-tight sm:text-4xl">
            {t("AI yordamchilar vaqtinchalik ishlamayapti")}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            {t("Texnik ishlar olib borilmoqda. Tez orada qaytamiz.")}
          </p>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-white/60">
            {t(
              "Hozircha botlar bilan muloqot va yangi bot yaratish vaqtincha o'chirilgan."
            )}
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-inset ring-white/10 backdrop-blur">
              <Bot className="h-3.5 w-3.5" />
              {t("AI botlar")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-inset ring-white/10 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              {t("Yangilanmoqda")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-inset ring-white/10 backdrop-blur">
              <Clock3 className="h-3.5 w-3.5" />
              {t("Tez orada")}
            </span>
          </div>

          <div className="mt-6">
            <Button
              asChild
              variant="secondary"
              className="h-10 gap-2 bg-white text-slate-900 hover:bg-white/90"
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                {t("Bosh sahifaga qaytish")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Bot,
            title: t("AI botlar"),
            text: t("Botlar yangilanmoqda va tez orada yana ishga tushadi."),
          },
          {
            icon: Sparkles,
            title: t("Yaxshiroq javoblar"),
            text: t("Yangi versiyada yanada aniqroq va foydali javoblar tayyorlanmoqda."),
          },
          {
            icon: Clock3,
            title: t("Tez orada"),
            text: t("Bu bo'lim vaqtincha yopilgan. Yangilanishlarni kuzatib boring."),
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border bg-card/60 p-4 opacity-80"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <item.icon className="h-4 w-4" />
            </span>
            <p className="mt-2.5 text-sm font-bold">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
