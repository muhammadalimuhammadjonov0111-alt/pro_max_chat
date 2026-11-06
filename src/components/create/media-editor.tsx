"use client";

import * as React from "react";
import {
  Smile,
  Sticker,
  Film,
  Type,
  Wand2,
  Undo2,
  Eraser,
  X,
  Copy,
  Trash2,
  Upload,
  Link2,
  Plus,
  RotateCw,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";

import type { Media, MediaEdit, MediaOverlay } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useT } from "@/hooks/use-i18n";
import { uploadFile } from "@/lib/upload";
import {
  EMOJI_GROUPS,
  STICKER_PACKS,
  GIF_PRESETS,
  FILTERS,
  TEXT_COLORS,
  ANIMATION_LABELS,
  OVERLAY_ANIMATIONS,
  DEFAULT_OVERLAY_SIZE,
  filterCss,
} from "@/lib/media-presets";
import { overlayPx } from "@/components/media/overlay-layer";
import { useMediaPlayback } from "@/components/media/use-media-playback";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Tool = "emoji" | "sticker" | "gif" | "text" | "fx";

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

export function MediaEditor({
  media,
  onChange,
  onBack,
}: {
  media: Media;
  onChange: (next: Media) => void;
  onBack: () => void;
}) {
  const t = useT();
  const stageRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const dragRef = React.useRef<{ id: string; dx: number; dy: number } | null>(
    null
  );
  const undoRef = React.useRef<Media[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [activeTool, setActiveTool] = React.useState<Tool | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [base, setBase] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [undoCount, setUndoCount] = React.useState(0);
  const [emojiGroup, setEmojiGroup] = React.useState(0);
  const [stickerPack, setStickerPack] = React.useState(0);
  const [textValue, setTextValue] = React.useState("");
  const [textColor, setTextColor] = React.useState(TEXT_COLORS[0]);
  const [gifUrl, setGifUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const isVideo = media.type === "video";
  const overlays = media.overlays ?? [];
  const selectedOverlay = overlays.find((o) => o.id === selected) ?? null;
  const filter = filterCss(media.edit?.filter);

  useMediaPlayback(videoRef, media.edit);

  // Track the size of the *media box* so overlay sizes stay proportional.
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setBase(Math.min(el.clientWidth, el.clientHeight) || 0)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [media.url]);

  // Keyboard shortcuts for the selected sticker / emoji / text.
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
        onChange({
          ...media,
          overlays: (media.overlays ?? []).filter((o) => o.id !== selected),
        });
        setSelected(null);
      } else if (e.key === "Escape") {
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, media, onChange]);

  function pushUndo(snapshot: Media) {
    undoRef.current.push(snapshot);
    if (undoRef.current.length > 40) undoRef.current.shift();
    setUndoCount(undoRef.current.length);
  }

  function undo() {
    const prev = undoRef.current.pop();
    setUndoCount(undoRef.current.length);
    if (!prev) return;
    onChange(prev);
    setSelected(null);
  }

  function patchEdit(p: Partial<MediaEdit>) {
    onChange({ ...media, edit: { ...media.edit, ...p } });
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
    pushUndo(media);
    onChange({ ...media, overlays: [...overlays, overlay] });
    setSelected(overlay.id);
  }

  function updateOverlay(id: string, p: Partial<MediaOverlay>) {
    onChange({
      ...media,
      overlays: overlays.map((o) => (o.id === id ? { ...o, ...p } : o)),
    });
  }

  function removeOverlay(id: string) {
    pushUndo(media);
    onChange({ ...media, overlays: overlays.filter((o) => o.id !== id) });
    setSelected(null);
  }

  function duplicateOverlay(o: MediaOverlay) {
    const copy = { ...o, id: uid(), x: clamp(o.x + 8, 2, 98), y: clamp(o.y + 8, 2, 98) };
    pushUndo(media);
    onChange({ ...media, overlays: [...overlays, copy] });
    setSelected(copy.id);
  }

  function clearAll() {
    if (!overlays.length) return;
    pushUndo(media);
    onChange({ ...media, overlays: [] });
    setSelected(null);
  }

  function onOverlayDown(e: React.PointerEvent, o: MediaOverlay) {
    e.preventDefault();
    e.stopPropagation();
    setSelected(o.id);
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      id: o.id,
      dx: o.x - ((e.clientX - rect.left) / rect.width) * 100,
      dy: o.y - ((e.clientY - rect.top) / rect.height) * 100,
    };
    pushUndo(media);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onOverlayMove(e: React.PointerEvent) {
    const d = dragRef.current;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100 + d.dx, 0, 100);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100 + d.dy, 0, 100);
    updateOverlay(d.id, { x, y });
  }

  function onOverlayUp(e: React.PointerEvent) {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  }

  async function handleUpload(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await uploadFile(file);
      addOverlay({ kind: "gif", value: uploaded.url, size: 28 });
      toast.success(t("Qo'shildi"));
    } catch {
      void 0;
    } finally {
      setBusy(false);
    }
  }

  const trimStart = media.edit?.trimStart ?? 0;
  const trimEnd =
    media.edit?.trimEnd && media.edit.trimEnd > 0
      ? media.edit.trimEnd
      : duration;

  function toggleTool(t: Tool) {
    setActiveTool((cur) => (cur === t ? null : t));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-black">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
      {/* Stage */}
      <div
        className="relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden p-3"
        onClick={() => setSelected(null)}
      >
        <div ref={stageRef} className="relative">
          {isVideo ? (
            <video
              ref={videoRef}
              src={media.url}
              className="block max-h-[56vh] max-w-full rounded-xl"
              style={{ filter }}
              playsInline
              loop
              muted
              autoPlay
              onLoadedMetadata={(e) =>
                setDuration(e.currentTarget.duration || 0)
              }
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.url}
              alt=""
              draggable={false}
              className="block max-h-[56vh] max-w-full rounded-xl"
              style={{ filter }}
            />
          )}

          {/* interactive overlay canvas */}
          <div className="absolute inset-0 rounded-xl">
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
                      "select-none leading-none transition-shadow",
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
                          textShadow: "0 2px 12px rgba(0,0,0,0.45)",
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
                    <>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOverlay(o.id);
                        }}
                        className="absolute -end-3 -top-3 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white shadow-lg"
                        aria-label={t("O'chirish")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateOverlay(o);
                        }}
                        className="absolute -start-3 -top-3 grid h-6 w-6 place-items-center rounded-full bg-white text-black shadow-lg"
                        aria-label={t("Nusxalash")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Back */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
          className="absolute start-3 top-3 z-30 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/70"
        >
          <RotateCw className="h-3.5 w-3.5" />
          {t("Almashtirish")}
        </button>

        {/* Selected overlay controls */}
        {selectedOverlay && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-3 bottom-3 z-30 mx-auto flex max-w-[560px] flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-neutral-900/90 p-2 text-white shadow-2xl backdrop-blur-xl"
          >
            <span className="flex items-center gap-1 text-[11px] font-semibold text-white/70">
              <Maximize2 className="h-3.5 w-3.5" />
            </span>
            <input
              type="range"
              min={4}
              max={70}
              step={1}
              value={Math.round(selectedOverlay.size)}
              onChange={(e) =>
                updateOverlay(selectedOverlay.id, {
                  size: Number(e.target.value),
                })
              }
              className="h-1 w-20 accent-violet-500"
              aria-label={t("Hajm")}
            />
            <span className="flex items-center gap-1 text-[11px] font-semibold text-white/70">
              <RotateCw className="h-3.5 w-3.5" />
            </span>
            <input
              type="range"
              min={-45}
              max={45}
              step={1}
              value={selectedOverlay.rotate ?? 0}
              onChange={(e) =>
                updateOverlay(selectedOverlay.id, {
                  rotate: Number(e.target.value),
                })
              }
              className="h-1 w-20 accent-violet-500"
              aria-label={t("Burish")}
            />
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => duplicateOverlay(selectedOverlay)}
                className="grid h-7 w-7 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
                aria-label={t("Nusxalash")}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => removeOverlay(selectedOverlay.id)}
                className="grid h-7 w-7 place-items-center rounded-full bg-red-500/90 transition hover:bg-red-500"
                aria-label={t("O'chirish")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setSelected(null)}
                className="grid h-7 w-7 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
                aria-label={t("Yopish")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar + pickers */}
      <div className="relative border-t border-white/10 bg-neutral-950/80 p-2 backdrop-blur-xl">
        {activeTool && (
          <div className="absolute inset-x-2 bottom-[calc(100%+10px)] z-40 max-h-[46vh] overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900/97 p-3 text-white shadow-2xl backdrop-blur-xl">
            {activeTool === "emoji" && (
              <>
                <ToolTabs
                  items={EMOJI_GROUPS.map((g) => g.label)}
                  index={emojiGroup}
                  onSelect={setEmojiGroup}
                />
                <div className="mt-2 grid grid-cols-8 gap-1 sm:grid-cols-10">
                  {EMOJI_GROUPS[emojiGroup].emojis.map((e, i) => (
                    <button
                      key={`${e}-${i}`}
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
                  items={STICKER_PACKS.map((g) => g.label)}
                  index={stickerPack}
                  onSelect={setStickerPack}
                />
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {STICKER_PACKS[stickerPack].items.map((s, i) => (
                    <button
                      key={`${s}-${i}`}
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
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                  {t("Tayyor GIFlar")}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {GIF_PRESETS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() =>
                        addOverlay({ kind: "gif", value: g.url, size: 30 })
                      }
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
                  <Button
                    size="sm"
                    variant="gradient"
                    onClick={() => {
                      if (!/^https?:\/\//.test(gifUrl)) {
                        void 0;
                        return;
                      }
                      addOverlay({ kind: "gif", value: gifUrl, size: 30 });
                      setGifUrl("");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/gif,image/*,video/mp4,video/webm"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {busy ? t("Yuklanmoqda...") : t("Qurilmadan yuklash")}
                  </Button>
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
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                    {t("Rang")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
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
                <Button
                  variant="gradient"
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
                >
                  <Type className="h-4 w-4" />
                  {t("Matn qo'shish")}
                </Button>
              </div>
            )}

            {activeTool === "fx" && (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                    {t("Filtrlar")}
                  </p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => patchEdit({ filter: f.id })}
                        className="group text-center"
                      >
                        <span
                          className={cn(
                            "block h-14 w-full rounded-xl border transition",
                            (media.edit?.filter ?? "none") === f.id
                              ? "border-violet-400 ring-2 ring-violet-400/50"
                              : "border-white/10 group-hover:border-white/30"
                          )}
                          style={
                            isVideo
                              ? {
                                  background:
                                    "linear-gradient(135deg,#7c3aed,#ec4899)",
                                  filter: f.css,
                                }
                              : {
                                  backgroundImage: `url(${media.url})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                  filter: f.css,
                                }
                          }
                        />
                        <span className="mt-1 block text-[10px] text-white/70">
                          {t(f.label)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {isVideo && (
                  <>
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                        {t("Tezlik")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[0.5, 1, 1.5, 2].map((s) => (
                          <Chip
                            key={s}
                            active={(media.edit?.speed ?? 1) === s}
                            onClick={() => patchEdit({ speed: s })}
                          >
                            {s}x
                          </Chip>
                        ))}
                      </div>
                    </div>

                    {duration > 0 && (
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                          {t("Kesish · {start}s – {end}s", {
                            start: trimStart.toFixed(1),
                            end: trimEnd.toFixed(1),
                          })}
                        </p>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(duration, trimStart + 0.2)}
                          step={0.1}
                          value={trimStart}
                          onChange={(e) =>
                            patchEdit({
                              trimStart: Math.min(
                                Number(e.target.value),
                                trimEnd - 0.2
                              ),
                            })
                          }
                          className="mb-1 h-1 w-full accent-violet-500"
                          aria-label={t("Boshlanish")}
                        />
                        <input
                          type="range"
                          min={Math.max(0, trimStart + 0.2)}
                          max={duration}
                          step={0.1}
                          value={trimEnd}
                          onChange={(e) =>
                            patchEdit({ trimEnd: Number(e.target.value) })
                          }
                          className="h-1 w-full accent-violet-500"
                          aria-label={t("Tugash")}
                        />
                      </div>
                    )}

                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                        {t("Ovoz")}
                      </p>
                      <div className="flex gap-1.5">
                        <Chip
                          active={(media.edit?.muted ?? true) === true}
                          onClick={() => patchEdit({ muted: true })}
                        >
                          {t("Ovozsiz")}
                        </Chip>
                        <Chip
                          active={(media.edit?.muted ?? true) === false}
                          onClick={() => patchEdit({ muted: false })}
                        >
                          {t("Ovoz bilan")}
                        </Chip>
                      </div>
                    </div>
                  </>
                )}

                {selectedOverlay && (
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                      {t("Tanlangan element harakati")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {OVERLAY_ANIMATIONS.map((a) => (
                        <Chip
                          key={a}
                          active={(selectedOverlay.animation ?? "none") === a}
                          onClick={() =>
                            updateOverlay(selectedOverlay.id, {
                              animation: a,
                            })
                          }
                        >
                          {t(ANIMATION_LABELS[a ?? "none"])}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

          <div className="flex items-center justify-center gap-0.5">
            <ToolButton
              icon={Smile}
              label="Emoji"
              active={activeTool === "emoji"}
              onClick={() => toggleTool("emoji")}
            />
            <ToolButton
              icon={Sticker}
              label="Stiker"
              active={activeTool === "sticker"}
              onClick={() => toggleTool("sticker")}
            />
            <ToolButton
              icon={Film}
              label="GIF"
              active={activeTool === "gif"}
              onClick={() => toggleTool("gif")}
            />
            <ToolButton
              icon={Type}
              label="Matn"
              active={activeTool === "text"}
              onClick={() => toggleTool("text")}
            />
            <ToolButton
              icon={Wand2}
              label="Effekt"
              active={activeTool === "fx"}
              onClick={() => toggleTool("fx")}
            />
            <span className="mx-1 h-6 w-px bg-white/15" />
            <ToolButton
              icon={Undo2}
              label="Orqaga"
              disabled={!undoCount}
              onClick={undo}
            />
            <ToolButton
              icon={Eraser}
              label="Tozalash"
              disabled={!overlays.length}
              onClick={clearAll}
            />
            <ToolButton
              icon={Upload}
              label="Yuklash"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            />
          </div>
        </div>
      </div>
    );
  }

function ToolButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-w-[58px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition active:scale-95",
        active
          ? "bg-white/15 text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white",
        disabled && "pointer-events-none opacity-35"
      )}
    >
      <Icon className="h-5 w-5" />
      {t(label)}
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
  const t = useT();
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {items.map((label, i) => (
        <button
          key={label}
          onClick={() => onSelect(i)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
            i === index
              ? "brand-gradient text-white"
              : "bg-white/5 text-white/70 hover:bg-white/10"
          )}
        >
          {t(label)}
        </button>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-semibold transition",
        active
          ? "brand-gradient text-white"
          : "bg-white/5 text-white/70 hover:bg-white/10"
      )}
    >
      {children}
    </button>
  );
}
