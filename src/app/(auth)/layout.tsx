import {
  BadgeCheck,
  MessageCircle,
  PlaySquare,
  Sparkles,
} from "lucide-react";

import { getT } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { Wordmark } from "@/components/shared/wordmark";

function compact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getT();
  const [people, posts] = await Promise.all([
    prisma.user.count({ where: { isBot: false, isBanned: false } }),
    prisma.post.count(),
  ]);

  const features = [
    {
      icon: MessageCircle,
      title: t("Tez va oson muloqot"),
      text: t("Do'stlaringiz bilan bir joyda gaplashing."),
    },
    {
      icon: PlaySquare,
      title: t("Reels va hikoyalar"),
      text: t("Qiziqarli lahzalar va yangi kontent har kuni."),
    },
    {
      icon: Sparkles,
      title: t("AI imkoniyatlari"),
      text: t("Aqlli botlar va yangi texnologiyalar bir joyda."),
    },
    {
      icon: BadgeCheck,
      title: t("Tasdiqlangan belgi"),
      text: t("Ishonchli va xavfsiz muloqot muhiti."),
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="brand-gradient animate-gradient pointer-events-none absolute -top-48 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(124,58,237,0.12),transparent)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 lg:flex-row lg:items-center lg:gap-16 lg:py-10">
        {/* Guest-facing brand panel */}
        <aside className="hidden flex-1 lg:block">
          <Wordmark className="text-4xl" />

          <h1 className="mt-6 text-balance text-4xl font-black leading-[1.1] tracking-tight">
            {t("Do'stlaringiz bilan bog'lanishning yangi usuli")}
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
            {t(
              "Xabarlar, Reels, hikoyalar va qiziqarli odamlar — barchasi bir joyda."
            )}
          </p>

          <div className="mt-8 grid max-w-md gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border bg-card/70 p-3.5 backdrop-blur"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-4 w-4" />
                </span>
                <p className="mt-2 text-sm font-bold">{feature.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex max-w-md items-center gap-3">
            <div className="flex-1 rounded-2xl border bg-card/70 px-4 py-3 backdrop-blur">
              <p className="text-xl font-black tabular-nums">{compact(people)}</p>
              <p className="text-xs text-muted-foreground">
                {t("Foydalanuvchilar")}
              </p>
            </div>
            <div className="flex-1 rounded-2xl border bg-card/70 px-4 py-3 backdrop-blur">
              <p className="text-xl font-black tabular-nums">{compact(posts)}</p>
              <p className="text-xs text-muted-foreground">{t("Postlar")}</p>
            </div>
            <div className="flex-1 rounded-2xl border bg-card/70 px-4 py-3 backdrop-blur">
              <p className="text-xl font-black">24/7</p>
              <p className="text-xs text-muted-foreground">{t("Onlayn")}</p>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-5 flex flex-col items-center text-center lg:hidden">
            <Wordmark className="text-3xl" />
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Do'stlaringiz bilan bog'lanishning yangi usuli")}
            </p>
          </div>

          {children}

          <footer className="mt-6 text-center text-xs text-muted-foreground">
            <p>© 2026 Gidgogram. {t("Barcha huquqlar himoyalangan.")}</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
