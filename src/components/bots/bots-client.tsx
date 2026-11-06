"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BadgeCheck,
  Bot,
  Check,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

import { toggleFollow } from "@/actions/user";
import { toggleBotPublic, deleteBot } from "@/actions/bot";
import type { BotListItem } from "@/actions/bot";
import {
  BOT_CATEGORIES,
  formatCompact,
  getCategory,
} from "@/lib/bot-categories";
import { useT } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BotBadge } from "@/components/shared/badges";

export function BotsClient({
  initialBots,
  myBots,
  stats,
}: {
  initialBots: BotListItem[];
  myBots: BotListItem[];
  stats: { bots: number; subscribers: number };
}) {
  const t = useT();
  const router = useRouter();
  const [overrides, setOverrides] = React.useState<
    Record<string, { isFollowing: boolean; followerCount: number }>
  >({});
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [busy, setBusy] = React.useState<string | null>(null);

  const bots = initialBots.map((b) => {
    const o = overrides[b.id];
    return o
      ? { ...b, isFollowing: o.isFollowing, followerCount: o.followerCount }
      : b;
  });

  const filtered = bots.filter((b) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      b.name.toLowerCase().includes(q) ||
      (b.username ?? "").toLowerCase().includes(q) ||
      (b.botDescription ?? "").toLowerCase().includes(q);
    const matchesCategory =
      category === "all" || b.botCategory === category;
    return matchesQuery && matchesCategory;
  });

  async function onFollow(bot: BotListItem) {
    setBusy(bot.id);
    try {
      const res = await toggleFollow(bot.id);
      if (res.ok) {
        setOverrides((o) => ({
          ...o,
          [bot.id]: {
            isFollowing: !!res.following,
            followerCount: bot.followerCount + (res.following ? 1 : -1),
          },
        }));
        toast.success(
          res.following
            ? t("@{username} kuzatilmoqda", { username: bot.username ?? "" })
            : t("Kuzatish bekor qilindi")
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function onTogglePublic(bot: BotListItem) {
    const res = await toggleBotPublic(bot.id, !bot.botPublic);
    if (res.ok) {
      toast.success(bot.botPublic ? t("Bot yopiq qilindi") : t("Bot ommaga ochildi"));
      router.refresh();
    } else {
      void 0;
    }
  }

  async function onDelete(bot: BotListItem) {
    if (
      !confirm(
        t("@{username} botini o'chirishni tasdiqlaysizmi?", {
          username: bot.username ?? "",
        })
      )
    )
      return;
    const res = await deleteBot(bot.id);
    if (res.ok) {
      toast.success(t("Bot o'chirildi"));
      router.refresh();
    } else {
      void 0;
    }
  }

  return (
    <div className="px-4 pb-24 sm:px-0 sm:pb-8 sm:pt-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 p-5 text-white shadow-xl sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-52 w-52 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> {t("AI botlar platformasi")}
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t("Aqlli botlar bilan gaplashing")}
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-white/85">
            {t(
              "Har qanday mavzuda yordam beradigan AI botlar. Savol bering — bir necha soniyada javob olasiz."
            )}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-2.5 backdrop-blur">
              <Bot className="h-6 w-6" />
              <div>
                <p className="text-lg font-extrabold leading-none">
                  {formatCompact(stats.bots)}
                </p>
                <p className="text-[11px] text-white/80">{t("AI botlar")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-2.5 backdrop-blur">
              <Users className="h-6 w-6" />
              <div>
                <p className="text-lg font-extrabold leading-none">
                  {formatCompact(stats.subscribers)}
                </p>
                <p className="text-[11px] text-white/80">{t("Obunachilar")}</p>
              </div>
            </div>
            <Button
              asChild
              variant="secondary"
              className="ms-auto bg-white text-violet-700 hover:bg-white/90"
            >
              <Link href="/create-bot">
                <Plus className="h-4 w-4" /> {t("Bot yaratish")}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* My bots */}
      {myBots.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 px-1 text-sm font-bold text-muted-foreground">
            {t("Mening botlarim · {count}", { count: myBots.length })}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {myBots.map((b) => (
              <div key={b.id} className="surface flex items-center gap-3 p-3">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={b.image ?? undefined} alt={b.name} />
                  <AvatarFallback>
                    {b.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {b.name} <BotBadge />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.botPublic ? t("Ommaviy") : t("Yopiq")} ·{" "}
                    {t("{count} obunachi", {
                      count: formatCompact(b.followerCount),
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTogglePublic(b)}
                >
                  {b.botPublic ? t("Yashirish") : t("Chiqarish")}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  aria-label={t("O'chirish")}
                  onClick={() => onDelete(b)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search + filters */}
      <div className="sticky top-14 z-20 -mx-4 mt-6 space-y-3 bg-background/85 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-3 lg:top-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Bot nomi yoki mavzuni qidirish...")}
            className="h-11 w-full rounded-xl border border-input bg-background ps-9 pe-3 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <CategoryChip
            active={category === "all"}
            onClick={() => setCategory("all")}
          >
            {t("Barchasi")}
          </CategoryChip>
          {BOT_CATEGORIES.map((c) => (
            <CategoryChip
              key={c.id}
              active={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              <span>{c.emoji}</span> {t(c.label)}
            </CategoryChip>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <span className="icon-tile-soft h-12 w-12">
            <Bot className="h-6 w-6" />
          </span>
          <p className="text-sm">{t("Bot topilmadi")}</p>
          <Button asChild variant="soft" size="sm">
            <Link href="/create-bot">
              <Plus className="h-4 w-4" /> {t("Birinchi botni yaratish")}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <BotCard
              key={b.id}
              bot={b}
              busy={busy === b.id}
              onFollow={() => onFollow(b)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
        active
          ? "border-transparent bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

function BotCard({
  bot,
  busy,
  onFollow,
}: {
  bot: BotListItem;
  busy: boolean;
  onFollow: () => void;
}) {
  const t = useT();
  const cat = getCategory(bot.botCategory);
  return (
    <div className="hover-lift surface group relative overflow-hidden p-4">
      <div
        className={cn(
          "absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-10 blur-2xl transition-opacity group-hover:opacity-25",
          cat.gradient
        )}
      />
      <div className="relative flex items-start gap-3">
        <Avatar className="h-12 w-12 ring-2 ring-background">
          <AvatarImage src={bot.image ?? undefined} alt={bot.name} />
          <AvatarFallback>
            {bot.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link
            href={`/${bot.username ?? ""}`}
            className="flex items-center gap-1.5"
          >
            <span className="truncate text-sm font-bold">{bot.name}</span>
            {bot.isVerified && (
              <BadgeCheck className="h-4 w-4 shrink-0 text-[#0095f6]" />
            )}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            @{bot.username}
          </p>
        </div>
        <BotBadge />
      </div>

      <p className="relative mt-3 line-clamp-2 min-h-[2.5rem] text-xs text-muted-foreground">
        {bot.botDescription ?? t(cat.description)}
      </p>

      <div className="relative mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium">
          {cat.emoji} {t(cat.label)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {formatCompact(bot.followerCount)}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3 w-3" />
          {formatCompact(bot.replyCount)}
        </span>
      </div>

      <div className="relative mt-3 flex gap-2">
        <Button asChild variant="blue" size="pill" className="flex-1">
          <Link href={`/messages?u=${bot.username}`}>
            <MessageCircle className="h-4 w-4" /> {t("Suhbat")}
          </Link>
        </Button>
        <Button
          variant={bot.isFollowing ? "secondary" : "outline"}
          size="pill"
          disabled={busy || bot.isOwner}
          onClick={onFollow}
        >
          {bot.isFollowing ? (
            <>
              <Check className="h-4 w-4" /> {t("Kuzatilyapti")}
            </>
          ) : (
            t("Kuzatish")
          )}
        </Button>
      </div>
    </div>
  );
}
