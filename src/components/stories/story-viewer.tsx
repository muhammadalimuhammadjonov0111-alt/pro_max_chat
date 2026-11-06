"use client";

import * as React from "react";
import {
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Send,
  Eye,
  MessageCircle,
  Music2,
  Loader2,
  BarChart3,
} from "lucide-react";

import {
  addStoryComment,
  deleteStoryComment,
  getStoryComments,
  getStoryStats,
  reactToStory,
  viewStory,
  type StoryCommentItem,
  type StoryGroup,
  type StoryStats,
} from "@/actions/story";
import { STORY_REACTIONS, storyDurationMs, type StoryItem } from "@/lib/story";
import { OverlayLayer } from "@/components/media/overlay-layer";
import { useT } from "@/hooks/use-i18n";
import { cn, formatNumber, timeAgo } from "@/lib/utils";
import { TimeAgo } from "@/components/shared/time-ago";
import type { PostUser } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/shared/badges";

/**
 * Full-screen story player shared by the feed bar and profile highlights.
 *
 * Viewers can react (8 emojis, double-tap = ❤️) and reply. The story's owner
 * additionally sees how many people watched, who reacted and every reply —
 * behind the "Ko'rganlar" panel. None of that is exposed to anyone else.
 */
export function StoryViewer({
  groups,
  startIndex,
  me,
  onClose,
  onChanged,
}: {
  groups: StoryGroup[];
  startIndex: number;
  me: PostUser;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const t = useT();
  const [gIndex, setGIndex] = React.useState(startIndex);
  const [sIndex, setSIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const [burst, setBurst] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [loadedComments, setLoadedComments] = React.useState<{
    storyId: string;
    list: StoryCommentItem[];
  } | null>(null);
  const [overrides, setOverrides] = React.useState<
    Record<string, Partial<StoryItem>>
  >({});

  const lastTapRef = React.useRef(0);
  const tapTimer = React.useRef<number | null>(null);
  const progressRef = React.useRef(0);
  const advanceRef = React.useRef<() => void>(() => {});

  // Local edits (reactions / counts) so the UI reacts instantly.
  const viewGroups = React.useMemo(
    () =>
      groups.map((g) => ({
        ...g,
        stories: g.stories.map((s) => ({ ...s, ...(overrides[s.id] ?? {}) })),
      })),
    [groups, overrides]
  );

  // `base*` come straight from props (server truth), `view*` include local edits.
  const baseGroup = groups[gIndex];
  const baseStory = baseGroup?.stories[sIndex];
  const group = viewGroups[gIndex];
  const story = group?.stories[sIndex];
  const isOwner = group?.user.id === me.id;
  const duration = story ? storyDurationMs(story) : 5000;

  const patch = React.useCallback(
    (id: string, p: Partial<StoryItem>) =>
      setOverrides((o) => ({ ...o, [id]: { ...o[id], ...p } })),
    []
  );

  const storyId = story?.id;

  const goTo = React.useCallback(
    (g: number, s: number) => {
      setGIndex(g);
      setSIndex(s);
      setProgress(0);
      progressRef.current = 0;
      setText("");
    },
    []
  );

  const advance = React.useCallback(() => {
    if (!group) return onClose();
    if (sIndex < group.stories.length - 1) goTo(gIndex, sIndex + 1);
    else if (gIndex < viewGroups.length - 1) goTo(gIndex + 1, 0);
    else onClose();
  }, [group, sIndex, gIndex, viewGroups.length, goTo, onClose]);

  const back = React.useCallback(() => {
    if (sIndex > 0) goTo(gIndex, sIndex - 1);
    else if (gIndex > 0) {
      const prev = viewGroups[gIndex - 1];
      goTo(gIndex - 1, Math.max(0, prev.stories.length - 1));
    }
  }, [sIndex, gIndex, viewGroups, goTo]);

  // Always call the newest `advance` from inside the interval.
  React.useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  // Auto-advance timer (paused while the user holds the screen).
  React.useEffect(() => {
    if (paused || !storyId) return;
    const step = (100 * 100) / duration;
    const id = window.setInterval(() => {
      const next = progressRef.current + step;
      if (next >= 100) {
        progressRef.current = 0;
        setProgress(0);
        advanceRef.current();
        return;
      }
      progressRef.current = next;
      setProgress(next);
    }, 100);
    return () => window.clearInterval(id);
  }, [paused, duration, storyId]);

  // Register the view and load whatever the current viewer is allowed to see.
  React.useEffect(() => {
    if (!storyId) return;
    void viewStory(storyId).catch(() => {});
    void getStoryComments(storyId)
      .then((list) => setLoadedComments({ storyId, list }))
      .catch(() => setLoadedComments({ storyId, list: [] }));
  }, [storyId]);

  React.useEffect(
    () => () => {
      if (tapTimer.current) window.clearTimeout(tapTimer.current);
    },
    []
  );

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") advance();
      else if (e.key === "ArrowLeft") back();
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, back, onClose]);

  function onSurfaceClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const now = Date.now();

    // Second tap inside 300ms = ❤️ instead of navigating.
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      if (tapTimer.current) {
        window.clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
      void sendReaction("❤️");
      return;
    }
    lastTapRef.current = now;

    const isBack = e.clientX - rect.left < rect.width * 0.35;
    tapTimer.current = window.setTimeout(
      () => {
        tapTimer.current = null;
        if (isBack) back();
        else advance();
      },
      isBack ? 60 : 240
    );
  }

  async function sendReaction(emoji: string) {
    if (!baseStory) return;
    const active = baseStory.myReaction !== emoji;
    setBurst(emoji);
    window.setTimeout(() => setBurst(null), 850);

    // Optimistic update, then reconcile with the server's answer.
    patch(baseStory.id, reactionState(baseStory, emoji, active));

    try {
      const res = await reactToStory(baseStory.id, emoji);
      patch(baseStory.id, reactionState(baseStory, res.emoji, res.active));
    } catch {
      patch(baseStory.id, {
        myReaction: baseStory.myReaction,
        reactions: baseStory.reactions,
      });
      void 0;
    }
  }

  async function sendComment() {
    if (!baseStory || !text.trim() || sending) return;
    setSending(true);
    try {
      const res = await addStoryComment(baseStory.id, text);
      if (!res.ok) {
        void 0;
        return;
      }
      setLoadedComments((prev) => ({
        storyId: baseStory.id,
        list:
          prev && prev.storyId === baseStory.id
            ? [...prev.list, res.comment]
            : [res.comment],
      }));
      patch(baseStory.id, { commentCount: baseStory.commentCount + 1 });
      setText("");
    } catch {
      void 0;
    } finally {
      setSending(false);
    }
  }

  if (!group || !story) return null;

  const username = group.user.username ?? group.user.name;
  const currentComments =
    loadedComments && loadedComments.storyId === story.id
      ? loadedComments.list
      : [];
  const myComments = currentComments.filter((c) => c.isMine);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl">
      {/* Desktop navigation */}
      <NavArrow side="left" onClick={back} disabled={gIndex === 0 && sIndex === 0} />
      <NavArrow
        side="right"
        onClick={advance}
        disabled={gIndex === viewGroups.length - 1 && sIndex === group.stories.length - 1}
      />

      <div className="relative flex h-full w-full flex-col overflow-hidden bg-neutral-950 text-white sm:h-[min(94dvh,880px)] sm:w-[min(100vw,470px)] sm:rounded-[30px] sm:border sm:border-white/10 sm:shadow-[0_40px_120px_-24px_rgba(0,0,0,0.9)]">
        {/* progress segments */}
        <div className="absolute inset-x-0 top-0 z-40 flex gap-1 px-2.5 pt-2.5">
          {group.stories.map((s, i) => (
            <span
              key={s.id}
              className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25"
            >
              <span
                className="block h-full rounded-full bg-white"
                style={{
                  width: i < sIndex ? "100%" : i === sIndex ? `${progress}%` : "0%",
                  transition: "width 120ms linear",
                }}
              />
            </span>
          ))}
        </div>

        {/* header */}
        <div className="absolute inset-x-0 top-0 z-30 flex items-center gap-2 px-3 pt-7">
          <span
            className={cn(
              "rounded-full p-[2px]",
              group.user.isPremium ? "story-ring" : "brand-gradient"
            )}
          >
            <span className="block rounded-full bg-neutral-950 p-[2px]">
              <Avatar className="h-8 w-8">
                <AvatarImage src={group.user.image ?? undefined} alt={username} />
                <AvatarFallback className="text-[10px]">
                  {username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </span>
          </span>

          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1 text-[13px] font-semibold leading-tight">
              <span className="truncate">{username}</span>
              {group.user.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
            </span>
            <span className="text-[11px] text-white/60">
              <TimeAgo date={story.createdAt} />
            </span>
          </span>

          {story.music && (
            <span className="pill-glass ml-1 min-w-0 max-w-[42%]">
              <Music2 className="h-3 w-3 shrink-0" />
              <span className="eq-bars mr-0.5 flex h-3 items-end gap-[2px]">
                <i />
                <i />
                <i />
              </span>
              <span className="truncate">{story.music.title}</span>
            </span>
          )}

          <span className="flex-1" />

          {isOwner && (
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              className="pill-glass"
              aria-label={t("Statistika")}
            >
              <BarChart3 className="h-3 w-3" />
              {t("Statistika")}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/25"
            aria-label={t("Yopish")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* surface */}
        <div
          className="relative flex flex-1 select-none items-center justify-center overflow-hidden pt-16"
          onClick={onSurfaceClick}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          {story.kind === "text" || (!story.mediaUrl && story.content) ? (
            <div
              className="absolute inset-0 flex items-center justify-center p-8"
              style={{ background: story.background ?? undefined }}
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.42),transparent_70%)]" />
              <p className="relative whitespace-pre-wrap break-words text-center text-2xl font-extrabold leading-snug text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.55)] sm:text-3xl">
                {story.content}
              </p>
            </div>
          ) : story.mediaType === "video" ? (
            <video
              key={story.id}
              src={story.mediaUrl ?? undefined}
              className="h-full w-full object-cover"
              autoPlay
              playsInline
              loop
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={story.id}
              src={story.mediaUrl ?? undefined}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          )}

          <OverlayLayer overlays={story.overlays} />

          {/* reaction burst */}
          {burst && (
            <span
              key={`${story.id}-${burst}`}
              className="pointer-events-none absolute inset-0 z-30 grid place-items-center"
            >
              <span className="story-burst text-7xl">{burst}</span>
            </span>
          )}

          {!paused && (
            <span className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/70 opacity-0 transition-opacity duration-300 hover:opacity-100">
              {t("Bosib turing — pauza")}
            </span>
          )}
        </div>

        {/* footer */}
        <div className="relative z-30 shrink-0 bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-transparent px-3 pb-4 pt-6">
          {isOwner ? (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatsOpen(true)}
                  className="pill-glass !bg-white/12 hover:!bg-white/20"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {t("{count} ko'rganlar", {
                    count: formatNumber(story.viewCount),
                  })}
                </button>
                <button
                  type="button"
                  onClick={() => setStatsOpen(true)}
                  className="pill-glass !bg-white/12 hover:!bg-white/20"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("{count} izoh", { count: formatNumber(story.commentCount) })}
                </button>
                {story.reactions.slice(0, 4).map((r) => (
                  <span key={r.emoji} className="pill-glass !bg-white/12">
                    {r.emoji}
                    <span className="tabular-nums">{formatNumber(r.count)}</span>
                  </span>
                ))}
              </div>
              <p className="px-1 text-[11px] text-white/45">
                {t("Reaksiya va izohlar faqat sizga ko'rinadi")}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myComments.length > 0 && (
                <div className="flex flex-col items-end gap-1">
                  {myComments.slice(-2).map((c) => (
                    <span
                      key={c.id}
                      className="max-w-[85%] rounded-2xl rounded-br-md bg-white/12 px-3 py-1.5 text-[13px] leading-snug"
                    >
                      {c.text}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {STORY_REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      void sendReaction(e);
                    }}
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-full text-2xl transition hover:bg-white/12 active:scale-90",
                      story.myReaction === e && "bg-white/18 ring-2 ring-white/50"
                    )}
                    aria-label={t("Reaksiya {emoji}", { emoji: e })}
                  >
                    {e}
                  </button>
                ))}
              </div>

              <form
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendComment();
                }}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 backdrop-blur-md transition-colors focus-within:border-white/40"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t("Izoh yozing...")}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/50"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-neutral-950 transition hover:scale-105 disabled:opacity-35"
                  aria-label={t("Yuborish")}
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {statsOpen && isOwner && (
          <StoryStatsSheet
            storyId={story.id}
            onClose={() => setStatsOpen(false)}
            onCommentDeleted={(id) => {
              setLoadedComments((prev) =>
                prev && prev.storyId === story.id
                  ? { ...prev, list: prev.list.filter((x) => x.id !== id) }
                  : prev
              );
              patch(story.id, {
                commentCount: Math.max(0, story.commentCount - 1),
              });
              onChanged?.();
            }}
          />
        )}
      </div>
    </div>
  );
}

function NavArrow({
  side,
  onClick,
  disabled,
}: {
  side: "left" | "right";
  onClick: () => void;
  disabled?: boolean;
}) {
  const t = useT();
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "absolute top-1/2 z-50 hidden -translate-y-1/2 rounded-full border border-white/15 bg-white/10 p-3 text-white backdrop-blur-md transition hover:bg-white/25 disabled:opacity-20 lg:grid",
        side === "left" ? "left-6" : "right-6"
      )}
      aria-label={side === "left" ? t("Oldingi") : t("Keyingi")}
    >
      <Icon className="h-6 w-6" />
    </button>
  );
}

/** Adjusts a reaction tally by `delta` for `emoji` and drops empty rows. */
function bump(
  list: { emoji: string; count: number }[],
  emoji: string,
  delta: number
) {
  if (!emoji || delta === 0) return list;
  return list
    .map((r) => (r.emoji === emoji ? { ...r, count: r.count + delta } : r))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * Resulting reaction state for a story after `emoji` became active/inactive.
 * Always computed from the server copy so retries stay idempotent.
 */
function reactionState(base: StoryItem, emoji: string, active: boolean) {
  let reactions = bump(base.reactions, emoji, active ? 1 : -1);
  if (base.myReaction && base.myReaction !== emoji) {
    reactions = bump(reactions, base.myReaction, -1);
  }
  return { myReaction: active ? emoji : null, reactions };
}

/** Owner-only sheet: who watched, who reacted and every reply. */
function StoryStatsSheet({
  storyId,
  onClose,
  onCommentDeleted,
}: {
  storyId: string;
  onClose: () => void;
  onCommentDeleted: (id: string) => void;
}) {
  const [tab, setTab] = React.useState<"viewers" | "reactions" | "comments">(
    "viewers"
  );
  const t = useT();
  const [stats, setStats] = React.useState<StoryStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    getStoryStats(storyId)
      .then((s) => {
        if (alive) setStats(s);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [storyId]);

  async function removeComment(id: string) {
    setBusyId(id);
    const res = await deleteStoryComment(id);
    setBusyId(null);
    if (res.ok) {
      setStats((s) =>
        s ? { ...s, comments: s.comments.filter((c) => c.id !== id) } : s
      );
      onCommentDeleted(id);
    }
  }

  const tabs = [
    { id: "viewers", label: t("Ko'rganlar"), count: stats?.viewers.length ?? 0 },
    { id: "reactions", label: t("Reaksiyalar"), count: stats?.reactions.length ?? 0 },
    { id: "comments", label: t("Izohlar"), count: stats?.comments.length ?? 0 },
  ] as const;

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/55 backdrop-blur-sm">
      <div
        className="max-h-[78%] overflow-hidden rounded-t-3xl border-t border-white/12 bg-neutral-950/97 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 pt-3">
          <span className="mx-auto h-1 w-10 rounded-full bg-white/25" />
        </div>
        <div className="flex items-center gap-2 px-4 pb-2 pt-1">
          <h3 className="flex-1 text-sm font-bold">{t("Hikoya statistikasi")}</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition hover:bg-white/25"
            aria-label={t("Yopish")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1.5 px-4 pb-3">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setTab(tabItem.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-bold transition",
                tab === tabItem.id
                  ? "brand-gradient text-white"
                  : "bg-white/8 text-white/70 hover:bg-white/15"
              )}
            >
              {tabItem.label}
              <span className="ml-1 tabular-nums opacity-70">{tabItem.count}</span>
            </button>
          ))}
        </div>

        <div className="max-h-[46vh] overflow-y-auto px-3 pb-5">
          {loading ? (
            <div className="grid place-items-center py-14 text-white/50">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !stats ? (
            <p className="py-14 text-center text-sm text-white/50">
              {t("Ma'lumot yo'q")}
            </p>
          ) : tab === "viewers" ? (
            stats.viewers.length === 0 ? (
              <Empty text={t("Hozircha hech kim ko'rmagan")} />
            ) : (
              <ul className="space-y-1">
                {stats.viewers.map((v) => (
                  <li
                    key={v.user.id + v.createdAt.toISOString()}
                    className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-white/5"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={v.user.image ?? undefined} alt="" />
                      <AvatarFallback className="text-[10px]">
                        {(v.user.username ?? v.user.name).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm font-semibold">
                      {v.user.username ?? v.user.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-white/45">
                      {timeAgo(v.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )
          ) : tab === "reactions" ? (
            stats.reactions.length === 0 ? (
              <Empty text={t("Hozircha reaksiya yo'q")} />
            ) : (
              <ul className="space-y-2">
                {stats.reactions.map((r) => (
                  <li
                    key={r.emoji}
                    className="rounded-2xl bg-white/5 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{r.emoji}</span>
                      <span className="flex-1 text-sm font-semibold">
                        {t("{count} ta reaksiya", {
                          count: formatNumber(r.count),
                        })}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-white/50">
                      {r.users.map((u) => u.username ?? u.name).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )
          ) : stats.comments.length === 0 ? (
            <Empty text={t("Hozircha izoh yo'q")} />
          ) : (
            <ul className="space-y-1">
              {stats.comments.map((c) => {
                const name = c.user.username ?? c.user.name;
                return (
                  <li
                    key={c.id}
                    className="group flex items-start gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-white/5"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={c.user.image ?? undefined} alt="" />
                      <AvatarFallback className="text-[10px]">
                        {name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm">
                      <span className="mr-1 font-semibold">{name}</span>
                      {c.text}
                      <span className="mt-0.5 block text-[11px] text-white/45">
                        {timeAgo(c.createdAt)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeComment(c.id)}
                      disabled={busyId === c.id}
                      className="shrink-0 rounded-full p-1.5 text-white/45 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
                      aria-label={t("O'chirish")}
                    >
                      {busyId === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-white/45">
      <Heart className="h-7 w-7" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
