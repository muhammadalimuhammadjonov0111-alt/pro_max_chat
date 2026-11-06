"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Volume2,
  VolumeX,
  Music2,
  Play,
  Pause,
  BadgeCheck,
  MoreHorizontal,
} from "lucide-react";

import { toggleLike, toggleSave } from "@/actions/post";
import { parseMedia, formatCount, cn } from "@/lib/utils";
import { filterCss } from "@/lib/media-presets";
import { useVideoMuted, toggleVideoMuted } from "@/lib/video-sound";
import { useT } from "@/hooks/use-i18n";
import type { PostWithDetails, PostUser } from "@/lib/types";
import type { ActiveAd } from "@/lib/ads";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OverlayLayer } from "@/components/media/overlay-layer";
import { useMediaPlayback } from "@/components/media/use-media-playback";
import { PostDetailDialog } from "@/components/feed/post-detail";
import { AdCard, AdReelSlide } from "@/components/ads/ad-card";

export function ReelsFeed({
  reels,
  me,
  ads,
}: {
  reels: PostWithDetails[];
  me: PostUser;
  ads: ActiveAd[];
}) {
  const t = useT();
  if (!reels.length) {
    return (
      <div className="no-scrollbar h-[calc(100dvh-5rem)] overflow-y-auto lg:h-dvh">
        <div className="relative flex h-[70vh] flex-col items-center justify-center gap-3 overflow-hidden text-center">
          <div className="pointer-events-none absolute left-1/2 top-1/3 h-52 w-52 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 text-white shadow-[0_18px_50px_-18px_rgba(124,58,237,0.9)]">
            <Play className="h-7 w-7 fill-current" />
          </span>
          <p className="relative text-lg font-bold">{t("Hozircha Reels yo'q")}</p>
          <p className="relative max-w-xs text-sm text-muted-foreground">
            {t("Post yaratishda «Reel»ni tanlab birinchi reelni joylang.")}
          </p>
        </div>
        <div className="space-y-4 px-4 pb-8">
          {ads.length > 0 ? (
            ads.map((ad) => <AdCard key={ad.id} ad={ad} />)
          ) : (
            <AdCard ad={null} />
          )}
        </div>
      </div>
    );
  }

  const leftoverAds = ads.slice(reels.length);

  return (
    <div className="relative">
      {/* Floating brand header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center pt-4">
        <span className="rounded-full border border-white/15 bg-black/40 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md">
          {t("Reels")}
        </span>
      </div>

      <div className="no-scrollbar h-[calc(100dvh-5rem)] snap-y snap-mandatory overflow-y-scroll bg-gradient-to-b from-black via-neutral-950 to-black lg:h-dvh">
        {reels.map((reel, i) => (
          <React.Fragment key={reel.id}>
            <ReelItem reel={reel} eager={i === 0} me={me} />
            {ads[i] ? <AdReelSlide key={ads[i].id} ad={ads[i]} /> : null}
            {ads.length === 0 && i === 0 ? <AdReelSlide ad={null} /> : null}
          </React.Fragment>
        ))}
        {leftoverAds.map((ad) => (
          <AdReelSlide key={ad.id} ad={ad} />
        ))}
      </div>
    </div>
  );
}

function ReelItem({
  reel,
  me,
  eager = false,
}: {
  reel: PostWithDetails;
  me: PostUser;
  eager?: boolean;
}) {
  const t = useT();
  const media = parseMedia(reel.media)[0];
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const singleTap = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useMediaPlayback(videoRef, media?.edit);

  const muted = useVideoMuted();
  const [paused, setPaused] = React.useState(false);
  const [showPlay, setShowPlay] = React.useState(false);
  const [liked, setLiked] = React.useState(reel.likedByMe);
  const [likeCount, setLikeCount] = React.useState(reel._count.likes);
  const [saved, setSaved] = React.useState(reel.savedByMe);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const lastTap = React.useRef(0);
  const [burst, setBurst] = React.useState(false);

  const username = reel.user.username ?? reel.user.name;

  React.useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!video) return;
        if (entry.isIntersecting) {
          video.play().then(() => setPaused(false)).catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.55, rootMargin: "200px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  async function like() {
    setLiked(true);
    setLikeCount((c) => c + 1);
    await toggleLike(reel.id);
  }

  async function handleLikeButton() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : c - 1));
    await toggleLike(reel.id);
  }

  function flashPlay() {
    setShowPlay(true);
    setTimeout(() => setShowPlay(false), 650);
  }

  function handleDoubleTap() {
    if (!liked) like();
    setBurst(true);
    setTimeout(() => setBurst(false), 800);
  }

  function handleTapPlayPause() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
    flashPlay();
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full snap-start snap-always items-center justify-center py-0 md:py-6"
    >
      <div className="relative h-full w-full overflow-hidden bg-black md:h-full md:max-h-[calc(100dvh-3rem)] md:w-auto md:max-w-[420px] md:rounded-3xl md:ring-1 md:ring-white/10 md:shadow-[0_40px_120px_-40px_rgba(124,58,237,0.6)]">
        {media?.type === "video" ? (
          <video
            ref={videoRef}
            src={media.url}
            className="h-full w-full object-cover md:aspect-[9/16]"
            style={{ filter: filterCss(media.edit?.filter) }}
            playsInline
            preload="auto"
            loop
            autoPlay
            muted={muted}
            onClick={() => {
              const now = Date.now();
              if (now - lastTap.current < 300) {
                if (singleTap.current) clearTimeout(singleTap.current);
                handleDoubleTap();
                lastTap.current = 0;
                return;
              }
              lastTap.current = now;
              if (singleTap.current) clearTimeout(singleTap.current);
              singleTap.current = setTimeout(() => {
                handleTapPlayPause();
              }, 250);
            }}
            onDoubleClick={handleDoubleTap}
          />
        ) : media?.type === "image" ? (
          <Image
            src={media.url}
            alt={reel.caption ?? "reel"}
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover"
            style={{ filter: filterCss(media.edit?.filter) }}
            priority={eager}
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-xs text-white/60">
            {t("Media mavjud emas")}
          </div>
        )}

        <OverlayLayer overlays={media?.overlays} />

        {/* cinematic gradients */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* double-tap heart burst */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200",
            burst ? "opacity-100" : "opacity-0"
          )}
        >
          <Heart className="h-28 w-28 scale-100 fill-white text-white drop-shadow-2xl animate-pop-in" />
        </div>

        {/* play/pause feedback */}
        {(paused || showPlay) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="animate-pop-in flex h-20 w-20 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md">
              {paused ? (
                <Play className="ml-1 h-9 w-9 fill-current" />
              ) : (
                <Pause className="h-9 w-9 fill-current" />
              )}
            </span>
          </div>
        )}

        {/* top controls */}
        <div className="absolute end-3 top-3 z-10 flex items-center gap-2">
          <button
            onClick={() => toggleVideoMuted()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65 active:scale-90"
            aria-label={muted ? t("Ovozni yoqish") : t("Ovozni o'chirish")}
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* right action rail */}
        <div className="absolute bottom-24 end-2.5 z-10 flex flex-col items-center gap-4 sm:bottom-28">
          <RailButton
            icon={Heart}
            label={formatCount(likeCount)}
            active={liked}
            filled={liked}
            onClick={handleLikeButton}
          />
          <RailButton
            icon={MessageCircle}
            label={formatCount(reel._count.comments)}
            onClick={() => setDetailOpen(true)}
          />
          <RailButton
            icon={Send}
            label={t("Ulashish")}
            onClick={() => setDetailOpen(true)}
          />
          <RailButton
            icon={Bookmark}
            filled={saved}
            active={saved}
            onClick={async () => {
              setSaved((v) => !v);
              await toggleSave(reel.id);
            }}
          />
          <button
            onClick={() => setDetailOpen(true)}
            className="text-white/85 transition hover:text-white"
            aria-label={t("Batafsil")}
          >
            <MoreHorizontal className="h-6 w-6" />
          </button>
        </div>

        {/* bottom info */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-3.5 pr-16">
          <div className="flex items-center gap-2.5">
            <Link href={`/${username}`} className="flex items-center gap-2.5">
              <span className="story-ring rounded-full p-[2px]">
                <Avatar className="h-9 w-9 border-2 border-black/40">
                  <AvatarImage src={reel.user.image ?? undefined} alt={username} />
                  <AvatarFallback className="text-[10px]">
                    {username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold text-white drop-shadow">
                {username}
                {reel.user.isVerified && (
                  <BadgeCheck className="h-4 w-4 text-[#0095f6]" />
                )}
              </span>
            </Link>
          </div>

          {reel.caption && (
            <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-white/95 drop-shadow">
              {reel.caption}
            </p>
          )}

          <div className="mt-2.5 flex items-center gap-2 text-white/85">
            <Music2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-[11px]">
              {t("Original audio · {username}", { username })}
            </span>
            <span className="ml-auto mr-1 h-3.5 w-3.5 shrink-0 animate-spin-slow rounded-full bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-amber-400" />
          </div>
        </div>
      </div>

      <PostDetailDialog
        post={reel}
        me={me}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

function RailButton({
  icon: Icon,
  label,
  active,
  filled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label?: string;
  active?: boolean;
  filled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-1">
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition-all duration-200 group-hover:bg-white/20 group-active:scale-90",
          active && "border-white/30"
        )}
      >
        <Icon
          className={cn(
            "h-[26px] w-[26px] transition-transform group-hover:scale-105",
            filled && "fill-current"
          )}
        />
      </span>
      {label && (
        <span className="text-[11px] font-semibold tabular-nums text-white drop-shadow">
          {label}
        </span>
      )}
    </button>
  );
}
