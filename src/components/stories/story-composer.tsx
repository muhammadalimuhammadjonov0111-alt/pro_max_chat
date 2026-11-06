"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  X,
  Smile,
  Sticker,
  Film,
  Type,
  Music2,
  Eraser,
  Upload,
  Link2,
  Plus,
  ImagePlus,
  Loader2,
  Copy,
  Trash2,
  RotateCw,
  Palette,
  Send,
} from "lucide-react";

import { createStory } from "@/actions/story";
import { uploadFile } from "@/lib/upload";
import { useT } from "@/hooks/use-i18n";
import { cn, type MediaOverlay } from "@/lib/utils";
import { STORY_BACKGROUNDS, type StoryMusic } from "@/lib/story";
import {
  EMOJI_GROUPS,
  STICKER_PACKS,
  GIF_PRESETS,
  TEXT_COLORS,
  DEFAULT_OVERLAY_SIZE,
} from "@/lib/media-presets";
import { overlayPx } from "@/components/media/overlay-layer";
import { Input } from "@/components/ui/input";

type Tool = "emoji" | "sticker" | "gif" | "text" | "music";
type Mode = "media" | "text";

const TOOLS: { id: Tool; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: "emoji", icon: Smile, label: "Emoji" },
  { id: "sticker", icon: Sticker, label: "Stiker" },
  { id: "gif", icon: Film, label: "GIF" },
  { id: "text", icon: Type, label: "Matn" },
  { id: "music", icon: Music2, label: "Musiqa" },
];

const TOOL_LABEL: Record<Tool, string> = {
  emoji: "Emoji",
  sticker: "Stikerlar",
  gif: "GIF",
  text: "Matn",
  music: "Musiqa",
};

const ANIM_CLASS: Record<string, string> = {
  none: "",
  pop: "animate-pop-in",
  float: "animate-float",
  pulse: "animate-pulse-soft",
  spin: "animate-spin-slow",
  bounce: "animate-bounce-soft",
};

const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Story composer: pick a photo/video or type a card, then decorate it with
 * emoji, stickers, GIFs, text and a music track before publishing.
 *
 * Instagram-style layout: the media fills a phone-width canvas, the top bar
 * and the round tool rail float *over* it and tool panels open as a bottom
 * sheet — nothing ever resizes the canvas.
 *
 * The editor only mounts while it is open, so every session starts clean.
 */
export function StoryComposer({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  if (!open) return null;
  return (
    <StoryComposerInner onOpenChange={onOpenChange} onCreated={onCreated} />
  );
}

function StoryComposerInner({
  onOpenChange,
  onCreated,
}: {
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const t = useT();
  const stageRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const audioRef = React.useRef<HTMLInputElement>(null);
  const dragRef = React.useRef<{ id: string; dx: number; dy: number } | null>(
    null
  );

  const [mode, setMode] = React.useState<Mode>("media");
  const [mediaUrl, setMediaUrl] = React.useState<string | null>(null);
  const [mediaType, setMediaType] = React.useState<"image" | "video">("image");
  const [content, setContent] = React.useState("");
  const [bgIndex, setBgIndex] = React.useState(0);
  const [overlays, setOverlays] = React.useState<MediaOverlay[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [music, setMusic] = React.useState<StoryMusic | null>(null);
  const [activeTool, setActiveTool] = React.useState<Tool | null>(null);
  const [base, setBase] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [emojiGroup, setEmojiGroup] = React.useState(0);
  const [stickerPack, setStickerPack] = React.useState(0);
  const [textValue, setTextValue] = React.useState("");
  const [textColor, setTextColor] = React.useState(TEXT_COLORS[0]);
  const [gifUrl, setGifUrl] = React.useState("");
  const [musicTitle, setMusicTitle] = React.useState("");
  const [musicUrl, setMusicUrl] = React.useState("");

  const selectedOverlay = overlays.find((o) => o.id === selected) ?? null;

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setBase(Math.min(el.clientWidth, el.clientHeight) || 0)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setOverlays((list) => list.filter((o) => o.id !== selected));
        setSelected(null);
      } else if (e.key === "Escape") {
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const canPublish =
    (mode === "media" && !!mediaUrl) || (mode === "text" && !!content.trim());

  function closePanels() {
    setSelected(null);
    setActiveTool(null);
  }

  function addOverlay(
    partial: Pick<MediaOverlay, "kind" | "value"> & Partial<MediaOverlay>
  ) {
    const n = overlays.length;
    const overlay: MediaOverlay = {
      id: uid(),
      x: 50 + ((n % 3) - 1) * 14,
      y: 50 + ((Math.floor(n / 3) % 3) - 1) * 14,
      size: DEFAULT_OVERLAY_SIZE[partial.kind],
      animation: partial.kind === "sticker" ? "float" : "pop",
      ...partial,
    };
    setOverlays((list) => [...list, overlay]);
    setSelected(overlay.id);
    // Close the sheet so the freshly placed element is visible.
    setActiveTool(null);
  }

  function updateOverlay(id: string, p: Partial<MediaOverlay>) {
    setOverlays((list) => list.map((o) => (o.id === id ? { ...o, ...p } : o)));
  }

  function onOverlayDown(e: React.PointerEvent, o: MediaOverlay) {
    e.preventDefault();
    e.stopPropagation();
    setSelected(o.id);
    setActiveTool(null);
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      id: o.id,
      dx: o.x - ((e.clientX - rect.left) / rect.width) * 100,
      dy: o.y - ((e.clientY - rect.top) / rect.height) * 100,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onOverlayMove(e: React.PointerEvent) {
    const d = dragRef.current;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    updateOverlay(d.id, {
      x: clamp(((e.clientX - rect.left) / rect.width) * 100 + d.dx, 0, 100),
      y: clamp(((e.clientY - rect.top) / rect.height) * 100 + d.dy, 0, 100),
    });
  }

  function onOverlayUp(e: React.PointerEvent) {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  }

  async function handlePickFile(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await uploadFile(file);
      setMediaUrl(uploaded.url);
      setMediaType(uploaded.type === "video" ? "video" : "image");
      setMode("media");
    } catch (e) {
      void 0;
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handlePickAudio(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await uploadFile(file);
      setMusic({
        title: musicTitle.trim() || file.name.replace(/\.[^.]+$/, ""),
        url: uploaded.url,
      });
      toast.success(t("Musiqa qo'shildi"));
    } catch (e) {
      void 0;
    } finally {
      setBusy(false);
      if (audioRef.current) audioRef.current.value = "";
    }
  }

  async function publish() {
    if (!canPublish || publishing) return;
    setPublishing(true);
    try {
      const res = await createStory({
        kind: mode,
        mediaUrl: mode === "media" ? mediaUrl : null,
        mediaType,
        content: mode === "text" ? content.trim() : null,
        background: mode === "text" ? STORY_BACKGROUNDS[bgIndex] : null,
        overlays,
        music,
      });
      if (!res.ok) {
        void 0;
        return;
      }
      toast.success(t("Hikoya joylandi"));
      onCreated();
      onOpenChange(false);
    } catch {
      void 0;
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black text-white">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handlePickFile(e.target.files)}
      />
      <input
        ref={audioRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => handlePickAudio(e.target.files)}
      />

      {/* phone-width canvas centered on desktop, full-bleed on mobile */}
      <div
        className="relative mx-auto min-h-0 w-full max-w-[460px] flex-1 overflow-hidden sm:my-3 sm:rounded-[28px] sm:ring-1 sm:ring-white/10"
        onClick={closePanels}
      >
        {/* media / text card — fills the whole canvas */}
        <div ref={stageRef} className="absolute inset-0 overflow-hidden bg-neutral-900">
          {mode === "text" ? (
            <div
              className="absolute inset-0 flex items-center justify-center p-7"
              style={{ background: STORY_BACKGROUNDS[bgIndex] }}
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.4),transparent_70%)]" />
              <p className="relative whitespace-pre-wrap break-words text-center text-2xl font-extrabold leading-snug drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)]">
                {content || t("Matnni shu yerga yozing...")}
              </p>
            </div>
          ) : mediaUrl ? (
            mediaType === "video" ? (
              <video
                src={mediaUrl}
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                playsInline
                loop
                muted
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.08),transparent_60%)] transition hover:bg-white/5"
            >
              {busy ? (
                <Loader2 className="h-8 w-8 animate-spin text-white/70" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-white/30 bg-white/5">
                  <ImagePlus className="h-7 w-7 text-white/80" />
                </span>
              )}
              <span className="text-sm font-semibold text-white/80">
                {t("Foto yoki video tanlang")}
              </span>
              <span className="px-8 text-center text-[11px] text-white/45">
                {t("Keyin ustiga emoji, GIF, matn va musiqa qo'shasiz")}
              </span>
            </button>
          )}

          {/* interactive overlays */}
          <div className="absolute inset-0">
            {overlays.map((o) => {
              const px = overlayPx(o.size, base || 1);
              const isImg =
                o.kind === "gif" ||
                (o.kind === "sticker" && o.value.startsWith("http"));
              const isSel = selected === o.id;
              return (
                <div
                  key={o.id}
                  onPointerDown={(e) => onOverlayDown(e, o)}
                  onPointerMove={onOverlayMove}
                  onPointerUp={onOverlayUp}
                  onPointerCancel={onOverlayUp}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "absolute touch-none",
                    isSel ? "z-20 cursor-grabbing" : "cursor-grab"
                  )}
                  style={{
                    left: `${o.x}%`,
                    top: `${o.y}%`,
                    transform: `translate(-50%, -50%) rotate(${o.rotate ?? 0}deg)`,
                  }}
                >
                  <div
                    className={cn(
                      "select-none leading-none",
                      ANIM_CLASS[o.animation ?? "none"],
                      isSel &&
                        "rounded-md outline-2 outline-offset-4 outline-dashed outline-white/80"
                    )}
                  >
                    {isImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.value}
                        alt=""
                        draggable={false}
                        style={{ width: px, height: "auto" }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: px,
                          color: o.color,
                          fontWeight: o.kind === "text" ? 800 : undefined,
                          textShadow: "0 2px 12px rgba(0,0,0,0.5)",
                          display: "inline-block",
                          maxWidth: (base || 300) * 0.92,
                          textAlign: "center",
                          whiteSpace: o.kind === "text" ? "pre-wrap" : "nowrap",
                        }}
                      >
                        {o.value}
                      </span>
                    )}
                  </div>

                  {isSel && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOverlays((l) => l.filter((x) => x.id !== o.id));
                        setSelected(null);
                      }}
                      className="absolute -end-3 -top-3 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white shadow-lg"
                      aria-label={t("O'chirish")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* top bar — floats over the media */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 top-0 z-40 flex items-center gap-2 bg-gradient-to-b from-black/60 via-black/20 to-transparent px-3 pb-7 pt-[max(0.75rem,env(safe-area-inset-top))]"
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
            aria-label={t("Yopish")}
          >
            <X className="h-4.5 w-4.5" />
          </button>

          {/* mode switch */}
          <div className="mx-auto flex gap-1 rounded-full border border-white/12 bg-black/40 p-1 backdrop-blur-md">
            <ModeTab
              active={mode === "media"}
              onClick={() => {
                setMode("media");
                setSelected(null);
              }}
            >
              {t("Media")}
            </ModeTab>
            <ModeTab
              active={mode === "text"}
              onClick={() => {
                setMode("text");
                setSelected(null);
                setActiveTool(null);
              }}
            >
              {t("Matn")}
            </ModeTab>
          </div>

          <button
            type="button"
            onClick={publish}
            disabled={!canPublish || publishing}
            className="brand-gradient flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold shadow-lg transition hover:brightness-110 active:scale-95 disabled:opacity-40"
          >
            {publishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {t("Joylash")}
          </button>
        </div>

        {/* right tool rail — round icon buttons over the media */}
        {!activeTool && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute end-2.5 top-[96px] z-40 flex flex-col gap-1.5"
          >
            {TOOLS.map((tool) => (
              <RailButton
                key={tool.id}
                icon={tool.icon}
                label={t(tool.label)}
                active={selectedOverlay?.kind === tool.id}
                badge={tool.id === "music" && !!music}
                onClick={() => {
                  setSelected(null);
                  setActiveTool(tool.id);
                }}
              />
            ))}
            <span className="my-0.5 h-px w-6 self-center bg-white/25" />
            <RailButton
              icon={Eraser}
              label={t("Barchasini tozalash")}
              disabled={!overlays.length}
              onClick={() => {
                setOverlays([]);
                setSelected(null);
              }}
            />
            <RailButton
              icon={Upload}
              label={t("Mediani almashtirish")}
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            />
          </div>
        )}

        {/* selected overlay controls */}
        {selectedOverlay && !activeTool && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-3 bottom-3 z-40 flex items-center gap-2 rounded-2xl border border-white/10 bg-neutral-900/95 p-2 shadow-2xl backdrop-blur-xl"
          >
            <RotateCw className="h-3.5 w-3.5 shrink-0 text-white/60" />
            <input
              type="range"
              min={4}
              max={70}
              value={Math.round(selectedOverlay.size)}
              onChange={(e) =>
                updateOverlay(selectedOverlay.id, {
                  size: Number(e.target.value),
                })
              }
              className="h-1 w-full accent-violet-500"
              aria-label={t("Hajm")}
            />
            <button
              type="button"
              onClick={() => {
                const copy = {
                  ...selectedOverlay,
                  id: uid(),
                  x: clamp(selectedOverlay.x + 8, 2, 98),
                  y: clamp(selectedOverlay.y + 8, 2, 98),
                };
                setOverlays((l) => [...l, copy]);
                setSelected(copy.id);
              }}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/25"
              aria-label={t("Nusxalash")}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setOverlays((l) => l.filter((o) => o.id !== selectedOverlay.id));
                setSelected(null);
              }}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-500/90 transition hover:bg-red-500"
              aria-label={t("O'chirish")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* tool panel — bottom sheet over the media, never resizes the canvas */}
        {activeTool && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 z-50 flex max-h-[52vh] flex-col rounded-t-3xl border-t border-white/10 bg-neutral-950/96 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            {/* sheet header: title + quick tool switch + close */}
            <div className="flex items-center gap-1.5 px-3 pb-2 pt-2.5">
              <span className="absolute left-1/2 top-1 h-1 w-9 -translate-x-1/2 rounded-full bg-white/25" />
              <span className="mr-auto pl-1 text-xs font-bold">
                {t(TOOL_LABEL[activeTool])}
              </span>
              <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => setActiveTool(tool.id)}
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full transition active:scale-90",
                      activeTool === tool.id
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/75 hover:bg-white/20 hover:text-white"
                    )}
                    aria-label={t(tool.label)}
                    title={t(tool.label)}
                  >
                    <tool.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white/75 transition hover:bg-white/20 hover:text-white"
                aria-label={t("Yopish")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
              {activeTool === "emoji" && (
                <>
                  <ToolTabs
                    items={EMOJI_GROUPS.map((g) => t(g.label))}
                    index={emojiGroup}
                    onSelect={setEmojiGroup}
                  />
                  <div className="mt-2 grid grid-cols-8 gap-1 sm:grid-cols-10">
                    {EMOJI_GROUPS[emojiGroup].emojis.map((e, i) => (
                      <button
                        key={`${e}-${i}`}
                        type="button"
                        onClick={() => addOverlay({ kind: "emoji", value: e })}
                        className="grid aspect-square place-items-center rounded-lg text-2xl transition hover:bg-white/10 active:scale-90"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activeTool === "sticker" && (
                <>
                  <ToolTabs
                    items={STICKER_PACKS.map((g) => t(g.label))}
                    index={stickerPack}
                    onSelect={setStickerPack}
                  />
                  <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-6">
                    {STICKER_PACKS[stickerPack].items.map((s, i) => (
                      <button
                        key={`${s}-${i}`}
                        type="button"
                        onClick={() =>
                          addOverlay({ kind: "sticker", value: s, animation: "float" })
                        }
                        className="grid aspect-square place-items-center rounded-2xl bg-white/5 text-4xl transition hover:bg-white/10 active:scale-90"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activeTool === "gif" && (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {GIF_PRESETS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => addOverlay({ kind: "gif", value: g.url, size: 30 })}
                        className="overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-violet-400/60"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={g.url}
                          alt={t(g.label)}
                          className="h-20 w-full object-cover"
                          loading="lazy"
                        />
                        <span className="block px-1.5 py-1 text-[10px] text-white/70">
                          {t(g.label)}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Link2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
                      <Input
                        value={gifUrl}
                        onChange={(e) => setGifUrl(e.target.value)}
                        placeholder={t("GIF havolasi (https://...)")}
                        className="h-9 border-white/10 bg-white/5 pl-8 text-white placeholder:text-white/35"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!/^https?:\/\//.test(gifUrl)) {
                          void 0;
                          return;
                        }
                        addOverlay({ kind: "gif", value: gifUrl, size: 30 });
                        setGifUrl("");
                      }}
                      className="brand-gradient grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:brightness-110"
                      aria-label={t("Qo'shish")}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}

              {activeTool === "text" && (
                <div className="space-y-3">
                  <Input
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    placeholder={t("Matn yozing...")}
                    autoFocus
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/35"
                  />
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/55">
                      {t("Rang")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTextColor(c)}
                          style={{ background: c }}
                          className={cn(
                            "h-7 w-7 rounded-full border transition",
                            textColor === c
                              ? "scale-110 border-white ring-2 ring-violet-400"
                              : "border-white/25"
                          )}
                          aria-label={c}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!textValue.trim()) {
                        void 0;
                        return;
                      }
                      addOverlay({
                        kind: "text",
                        value: textValue.trim(),
                        color: textColor,
                      });
                      setTextValue("");
                    }}
                    className="brand-gradient w-full rounded-full py-2 text-sm font-bold transition hover:brightness-110"
                  >
                    {t("Matn qo'shish")}
                  </button>
                </div>
              )}

              {activeTool === "music" && (
                <div className="space-y-3">
                  <Input
                    value={musicTitle}
                    onChange={(e) => setMusicTitle(e.target.value)}
                    placeholder={t("Musiqa nomi")}
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/35"
                  />
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Music2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
                      <Input
                        value={musicUrl}
                        onChange={(e) => setMusicUrl(e.target.value)}
                        placeholder={t("Audio havolasi (https://...)")}
                        className="h-9 border-white/10 bg-white/5 pl-8 text-white placeholder:text-white/35"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!/^https?:\/\//.test(musicUrl)) {
                          void 0;
                          return;
                        }
                        setMusic({
                          title: musicTitle.trim() || t("Musiqa"),
                          url: musicUrl,
                        });
                        setMusicUrl("");
                        toast.success(t("Musiqa tanlandi"));
                      }}
                      className="brand-gradient grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:brightness-110"
                      aria-label={t("Qo'shish")}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => audioRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {t("Qurilmadan audio yuklash")}
                  </button>

                  {music && (
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <Music2 className="h-4 w-4 shrink-0 text-white/70" />
                      <span className="flex-1 truncate text-sm">{music.title}</span>
                      <button
                        type="button"
                        onClick={() => setMusic(null)}
                        className="shrink-0 rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
                        aria-label={t("Musiqani olib tashlash")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* text card editor — bottom sheet shown while typing the card */}
        {mode === "text" && !activeTool && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-white/10 bg-neutral-950/92 px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            <span className="absolute left-1/2 top-1 h-1 w-9 -translate-x-1/2 rounded-full bg-white/25" />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("Qandaydir fikr yozing...")}
              rows={2}
              maxLength={220}
              className="mt-1 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/35"
            />
            <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Palette className="h-3.5 w-3.5 shrink-0 text-white/50" />
              {STORY_BACKGROUNDS.map((bg, i) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setBgIndex(i)}
                  style={{ background: bg }}
                  className={cn(
                    "h-7 w-7 shrink-0 rounded-full border transition",
                    bgIndex === i
                      ? "scale-110 border-white ring-2 ring-white/60"
                      : "border-white/25"
                  )}
                  aria-label={`${t("Fon")} ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeTab({
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
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-[12px] font-bold transition",
        active ? "brand-gradient text-white" : "text-white/65 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

/** Round glass icon button used by the floating right-hand tool rail. */
function RailButton({
  icon: Icon,
  label,
  active,
  disabled,
  badge,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  badge?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/45 backdrop-blur-md transition hover:bg-black/65 active:scale-90",
        active && "border-white bg-white text-black hover:bg-white",
        disabled && "pointer-events-none opacity-35"
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
      {badge && (
        <span className="absolute end-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
      )}
    </button>
  );
}

function ToolTabs({
  items,
  index,
  onSelect,
}: {
  items: string[];
  index: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(i)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
            i === index
              ? "brand-gradient text-white"
              : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
