"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  Eye,
  Flag,
  MapPin,
  Clapperboard,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

import { toggleLike, toggleSave, deletePost, recordView } from "@/actions/post";
import { useT } from "@/hooks/use-i18n";
import { parseMedia, formatNumber, cn } from "@/lib/utils";
import { filterCss } from "@/lib/media-presets";
import { useVideoMuted, toggleVideoMuted } from "@/lib/video-sound";
import { OverlayLayer } from "@/components/media/overlay-layer";
import { TimeAgo } from "@/components/shared/time-ago";
import type { PostWithDetails, PostUser } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge, PremiumBadge } from "@/components/shared/badges";
import { RichText } from "@/components/shared/rich-text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Comments } from "./comments";
import { PostDetailDialog } from "./post-detail";
import { LikesDialog } from "./likes-dialog";
import { EditPostDialog } from "./edit-post-dialog";
import { ReportDialog } from "./report-dialog";

export function PostCard({
  post,
  me,
  eager = false,
}: {
  post: PostWithDetails;
  me: PostUser;
  /** Set true for the first card so the above-the-fold image is not lazy-loaded. */
  eager?: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const media = React.useMemo(() => parseMedia(post.media), [post.media]);

  const [liked, setLiked] = React.useState(post.likedByMe);
  const [likeCount, setLikeCount] = React.useState(post._count.likes);
  const [saved, setSaved] = React.useState(post.savedByMe);
  const [viewCount, setViewCount] = React.useState(post._count.views);
  const [index, setIndex] = React.useState(0);
  const [burst, setBurst] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [likesOpen, setLikesOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const muted = useVideoMuted();
  const lastTapRef = React.useRef(0);
  const singleTapRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const isOwner = post.userId === me.id;

  // Count a view once (only for other people's posts).
  const viewedRef = React.useRef(false);
  React.useEffect(() => {
    if (isOwner || viewedRef.current) return;
    viewedRef.current = true;
    setViewCount((c) => c + 1);
    recordView(post.id).catch(() => {});
  }, [isOwner, post.id]);

  async function handleLike() {
    setLiked((v) => !v);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    await toggleLike(post.id);
  }

  function handleMediaTap() {
    const now = Date.now();
    // Double tap → like.
    if (now - lastTapRef.current < 300) {
      if (singleTapRef.current) {
        clearTimeout(singleTapRef.current);
        singleTapRef.current = null;
      }
      lastTapRef.current = 0;
      if (!liked) {
        setLiked(true);
        setLikeCount((c) => c + 1);
        toggleLike(post.id);
      }
      setBurst(true);
      setTimeout(() => setBurst(false), 900);
      return;
    }
    // Single tap → open Reels.
    lastTapRef.current = now;
    if (singleTapRef.current) clearTimeout(singleTapRef.current);
    singleTapRef.current = setTimeout(() => router.push("/reels"), 260);
  }

  async function handleSave() {
    setSaved((v) => !v);
    const res = await toggleSave(post.id);
    toast.success(res.saved ? t("Saqlandi") : t("Olib tashlandi"));
  }

  async function handleDelete() {
    const res = await deletePost(post.id);
    if (res.ok) {
      toast.success(t("Post o'chirildi"));
      router.refresh();
    } else {
      void 0;
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/p/${post.id}`);
    toast.success(t("Havola nusxalandi"));
  }

  const username = post.user.username ?? post.user.name;
  const current = media[index];

  return (
    <article className="card-glow group/post overflow-hidden border-b bg-card/95 sm:rounded-3xl sm:border sm:shadow-sm sm:transition-all sm:duration-300 sm:hover:-translate-y-0.5 sm:hover:shadow-xl">
      {/* Header */}
      <header className="flex items-center gap-3 px-3 py-3 sm:px-4">
        <Link
          href={`/${username}`}
          className={cn(
            "shrink-0 rounded-full p-[2px] transition-transform duration-300 hover:scale-105",
            post.user.isPremium ? "story-ring" : "brand-gradient"
          )}
        >
          <span className="block rounded-full bg-card p-[2px]">
            <Avatar className="h-9 w-9">
              <AvatarImage src={post.user.image ?? undefined} alt={username} />
              <AvatarFallback className="text-[10px]">
                {username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5 text-sm">
            <Link
              href={`/${username}`}
              className="flex min-w-0 items-center gap-1 font-semibold transition hover:opacity-70"
            >
              <span className="truncate">{username}</span>
              {post.user.isVerified && (
                <VerifiedBadge className="h-3.5 w-3.5 shrink-0" />
              )}
              {post.user.isPremium && <PremiumBadge className="px-1.5" />}
            </Link>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            {post.location ? (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {post.location}
              </span>
            ) : (
              <span className="truncate">
                <TimeAgo date={post.createdAt} />
              </span>
            )}
          </div>
        </div>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label={t("Boshqa amallar")}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setDetailOpen(true)}>
              {t("Batafsil")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyLink}>
              {t("Havolani nusxalash")}
            </DropdownMenuItem>
            {isOwner ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil /> {t("Tahrirlash")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-like focus:text-like"
                >
                  <Trash2 /> {t("O'chirish")}
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setReportOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Flag /> {t("Shikoyat qilish")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Media */}
      <div className="group/media relative select-none bg-black" onClick={handleMediaTap}>
        {current?.type === "video" ? (
          <video
            src={current.url}
            className="w-full object-contain"
            style={{ filter: filterCss(current.edit?.filter) }}
            playsInline
            muted={muted}
            loop
            autoPlay
            preload="auto"
            ref={(el) => {
              videoRef.current = el;
              if (!el) return;
              let obs: IntersectionObserver | null = null;
              const container =
                (el.closest(".group\\/media") as HTMLElement) || el.parentElement;
              if (container) {
                obs = new IntersectionObserver(
                  ([e]) => {
                    if (e.isIntersecting) {
                      el.play().catch(() => {});
                    } else {
                      el.pause();
                    }
                  },
                  { threshold: 0.4, rootMargin: "200px 0px" }
                );
                obs.observe(container);
              }
              return () => {
                obs?.disconnect();
              };
            }}
          />
        ) : (
          <Image
            src={current?.url ?? "/globe.svg"}
            alt={post.caption ?? "Post"}
            width={1080}
            height={1080}
            className="w-full object-contain"
            style={{ filter: filterCss(current?.edit?.filter) }}
            loading={eager ? "eager" : undefined}
            unoptimized
          />
        )}

        <OverlayLayer overlays={current?.overlays} />

        {/* top scrim */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 via-black/15 to-transparent" />

        {/* badges */}
        <div className="absolute start-3 top-3 z-20 flex items-center gap-2">
          {post.isReel && (
            <span className="pill-glass">
              <Clapperboard className="h-3 w-3" />
              {t("Reel")}
            </span>
          )}
          {current?.type === "video" && (
            <span className="pill-glass">
              <Play className="h-3 w-3 fill-white" />
              {t("Video")}
            </span>
          )}
        </div>

        {media.length > 1 && (
          <span className="pill-glass absolute end-3 top-3 z-20 tabular-nums">
            {index + 1}/{media.length}
          </span>
        )}

        {/* mute / unmute */}
        {current?.type === "video" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleVideoMuted();
            }}
            className="absolute bottom-3 end-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/70 active:scale-90"
            aria-label={muted ? t("Ovozni yoqish") : t("Ovozni o'chirish")}
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
        )}

        {/* double tap heart */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center",
            burst ? "opacity-100" : "opacity-0"
          )}
        >
          <Heart
            className="h-24 w-24 fill-white text-white drop-shadow-lg"
            style={{ animation: burst ? "heart-pop 0.9s ease" : undefined }}
          />
        </div>

        {/* carousel arrows */}
        {media.length > 1 && index > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => i - 1);
            }}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/45 p-1.5 text-white opacity-0 backdrop-blur-md transition hover:bg-black/70 group-hover/media:opacity-100 max-sm:opacity-100"
            aria-label={t("Previous")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {media.length > 1 && index < media.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => i + 1);
            }}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/45 p-1.5 text-white opacity-0 backdrop-blur-md transition hover:bg-black/70 group-hover/media:opacity-100 max-sm:opacity-100"
            aria-label={t("Next")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* dot indicator */}
        {media.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                }}
                aria-label={t("{n}-media", { n: i + 1 })}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index
                    ? "w-5 bg-white"
                    : "w-1.5 bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 px-2 pt-2.5 sm:px-3">
        <button
          onClick={handleLike}
          aria-label={t("Yoqdi")}
          aria-pressed={liked}
          className={cn(
            "icon-btn",
            liked
              ? "text-like"
              : "text-foreground hover:bg-rose-500/10 hover:text-rose-500"
          )}
        >
          <Heart className={cn("h-6 w-6", liked && "fill-like")} />
        </button>
        <button
          onClick={() => setDetailOpen(true)}
          aria-label={t("Izohlar")}
          className="icon-btn text-foreground hover:bg-violet-500/10 hover:text-violet-500"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
        <button
          onClick={copyLink}
          aria-label={t("Ulashish")}
          className="icon-btn text-foreground hover:bg-sky-500/10 hover:text-sky-500"
        >
          <Send className="h-6 w-6" />
        </button>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          aria-label={t("Saqlash")}
          aria-pressed={saved}
          className={cn(
            "icon-btn",
            saved
              ? "text-amber-500"
              : "text-foreground hover:bg-amber-500/10 hover:text-amber-500"
          )}
        >
          <Bookmark className={cn("h-6 w-6", saved && "fill-amber-500")} />
        </button>
      </div>

      {/* Likes + caption + comments */}
      <div className="space-y-1.5 px-3 pb-3 pt-2 sm:px-4">
        {likeCount > 0 && (
          <button
            onClick={() => setLikesOpen(true)}
            className="flex items-center gap-1.5 text-sm font-bold tabular-nums transition hover:opacity-70"
          >
            <Heart className="h-3.5 w-3.5 fill-like text-like" />
            {t("{count} ta yoqdi", { count: formatNumber(likeCount) })}
          </button>
        )}

        {post.caption && (
          <p className="text-sm leading-relaxed">
            <Link
              href={`/${username}`}
              className="mr-1 font-semibold hover:opacity-70"
            >
              {username}
            </Link>
            <RichText text={post.caption} />
          </p>
        )}

        {post.editedAt && (
          <p className="text-[11px] text-muted-foreground">{t("tahrirlangan")}</p>
        )}

        {post._count.comments > 0 && (
          <button
            onClick={() => setDetailOpen(true)}
            className="block text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            {t("{count} ta izohni ko'rish", { count: post._count.comments })}
          </button>
        )}

        <div className="flex items-center gap-3 pt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>
            <TimeAgo date={post.createdAt} />
          </span>
          {isOwner && viewCount > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />{" "}
              {t("{count} ko'rish", { count: formatNumber(viewCount) })}
            </span>
          )}
        </div>

        <Comments postId={post.id} me={me} compact />
      </div>

      <PostDetailDialog
        post={post}
        me={me}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <LikesDialog
        postId={post.id}
        open={likesOpen}
        onOpenChange={setLikesOpen}
      />

      <EditPostDialog post={post} open={editOpen} onOpenChange={setEditOpen} />

      <ReportDialog
        targetType="post"
        targetId={post.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </article>
  );
}
