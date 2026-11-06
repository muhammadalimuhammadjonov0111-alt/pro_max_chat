"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Settings,
  Link as LinkIcon,
  Crown,
  Sparkles,
  MapPin,
  CalendarDays,
  Pencil,
  Share2,
  MessageCircle,
  Check,
  Bot as BotIcon,
  UserRound,
} from "lucide-react";

import { EditProfileDialog } from "./edit-profile-dialog";
import { FollowButton } from "@/components/shared/follow-button";
import { useT } from "@/hooks/use-i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  VerifiedBadge,
  AdminBadge,
  PremiumBadge,
  BotBadge,
} from "@/components/shared/badges";
import { cn, formatCount, formatDate } from "@/lib/utils";

export function ProfileHeader({
  profile,
  counts,
  isMe,
  isFollowing,
  isRequested,
  isAdmin,
  username,
  joinedAt,
}: {
  profile: {
    id: string;
    name: string;
    username: string | null;
    bio: string | null;
    link: string | null;
    image: string | null;
    phone?: string | null;
    gender?: string | null;
    birthday?: string | null;
    location?: string | null;
    isVerified: boolean;
    isPremium: boolean;
    isBot?: boolean;
  };
  counts: { posts: number; followers: number; following: number };
  isMe: boolean;
  isFollowing: boolean;
  isRequested: boolean;
  isAdmin: boolean;
  username: string;
  joinedAt?: string;
}) {
  const t = useT();
  const [editOpen, setEditOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handle = profile.username ?? username;

  async function share() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${profile.username ?? username}`
      );
      setCopied(true);
      toast.success(t("Havola nusxalandi"));
      setTimeout(() => setCopied(false), 1800);
    } catch {
      void 0;
    }
  }

  const actions = isMe ? (
    <>
      <Button size="pill" variant="soft" onClick={() => setEditOpen(true)}>
        <Pencil className="h-4 w-4" />
        {t("Tahrirlash")}
      </Button>
      <Button size="pill" variant="outline" asChild>
        <Link href="/settings">
          <Settings className="h-4 w-4" />
          {t("Sozlamalar")}
        </Link>
      </Button>
    </>
  ) : (
    <>
      <FollowButton
        targetId={profile.id}
        initialFollowing={isFollowing}
        initialRequested={isRequested}
      />
      <Button size="pill" variant="gradient" asChild>
        <Link href={`/messages?u=${handle}`}>
          <MessageCircle className="h-4 w-4" />
          {t("Xabar")}
        </Link>
      </Button>
      <Button
        size="icon-sm"
        variant="outline"
        onClick={share}
        aria-label={t("Havolani nusxalash")}
      >
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      </Button>
    </>
  );

  return (
    <header className="relative">
      {/* Cover banner */}
      <div className="relative h-32 overflow-hidden sm:h-52">
        <div className="banner absolute inset-0" />
        <div className="banner-grid absolute inset-0 opacity-70" />
        <div className="absolute -left-20 top-2 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-52 w-52 rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/80 to-transparent" />
      </div>

      <div className="relative px-4 pb-6 sm:px-8">
        {/* Avatar + desktop actions */}
        <div className="-mt-12 flex items-end justify-between gap-4 sm:-mt-20">
          <div className="relative shrink-0">
            <div className="story-ring rounded-full p-[3px] shadow-[0_22px_55px_-24px_rgba(124,58,237,0.85)]">
              <div className="rounded-full bg-background p-[3px]">
                <Avatar className="h-24 w-24 sm:h-36 sm:w-36">
                  <AvatarImage src={profile.image ?? undefined} alt={username} />
                  <AvatarFallback className="text-2xl sm:text-4xl">
                    {profile.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            {profile.isBot && (
              <span
                title={t("AI · onlayn")}
                className="presence-online absolute bottom-1 end-1 h-4 w-4 rounded-full sm:h-5 sm:w-5"
              />
            )}
          </div>

          <div className="mb-1 hidden flex-wrap items-center justify-end gap-2 sm:flex">
            {actions}
          </div>
        </div>

        {/* Identity */}
        <div className="mt-3.5">
          <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xl font-bold tracking-tight sm:text-2xl">
            {profile.isPremium ? (
              <span className="gradient-name">{profile.name}</span>
            ) : (
              profile.name
            )}
            {profile.isVerified && <VerifiedBadge className="h-5 w-5" />}
            {isAdmin && <AdminBadge className="h-5 w-5" />}
            {profile.isBot && <BotBadge className="h-5" />}
            {profile.isPremium && <PremiumBadge />}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            @{handle}
          </p>
        </div>

        {/* Mobile actions */}
        <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
          {actions}
        </div>

        {profile.bio && (
          <p className="mt-3 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
            {profile.bio}
          </p>
        )}

        {/* Meta chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {profile.link && (
            <a
              className="chip text-[#0095f6] hover:text-[#0095f6]"
              href={
                profile.link.startsWith("http")
                  ? profile.link
                  : `https://${profile.link}`
              }
              target="_blank"
              rel="noreferrer"
            >
              <LinkIcon className="h-3 w-3" />
              {profile.link.replace(/^https?:\/\//, "")}
            </a>
          )}
          {profile.location && (
            <span className="chip">
              <MapPin className="h-3 w-3" />
              {profile.location}
            </span>
          )}
          {profile.gender && (
            <span className="chip">
              <UserRound className="h-3 w-3" />
              {profile.gender === "male"
                ? t("Erkak")
                : profile.gender === "female"
                  ? t("Ayol")
                  : t("Boshqa")}
            </span>
          )}
          {joinedAt && (
            <span className="chip">
              <CalendarDays className="h-3 w-3" />
              {t("{date} dan beri", { date: formatDate(joinedAt) })}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3">
          <Stat value={counts.posts} label={t("Post")} />
          <Stat
            value={counts.followers}
            label={t("Kuzatuvchi")}
            href={`/${handle}/followers`}
          />
          <Stat
            value={counts.following}
            label={t("Kuzatilmoqda")}
            href={`/${handle}/following`}
          />
        </div>

        {/* Bot helper card */}
        {profile.isBot && !isMe && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-md">
              <BotIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t("Bu AI bot")}</p>
              <p className="truncate text-xs text-muted-foreground">
                {t("Savol bering — bir necha soniyada javob beradi.")}
              </p>
            </div>
            <Button size="pill" variant="gradient" asChild>
              <Link href={`/messages?u=${handle}`}>
                <MessageCircle className="h-4 w-4" />
                {t("Suhbat")}
              </Link>
            </Button>
          </div>
        )}

        {/* Premium upsell for self */}
        {isMe && !profile.isPremium && !profile.isBot && (
          <Link
            href="/premium"
            className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3.5 text-sm transition-colors hover:from-amber-500/20"
          >
            <span className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <span>{t("Premiumga o'tib, tasdiqlangan belgi oling")}</span>
            </span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </Link>
        )}
      </div>

      {isMe && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          user={profile}
        />
      )}
    </header>
  );
}

function Stat({
  value,
  label,
  href,
}: {
  value: number;
  label: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-lg font-extrabold leading-none sm:text-xl">
        {formatCount(value)}
      </p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
        {label}
      </p>
    </>
  );

  return href ? (
    <Link href={href} className={cn("stat-card block")}>
      {inner}
    </Link>
  ) : (
    <div className="stat-card">{inner}</div>
  );
}
