"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MapPin,
  PlusSquare,
  ArrowLeft,
  ImageIcon,
  Smile,
  Sticker,
  Film,
  Wand2,
  Images,
  Sparkles,
} from "lucide-react";

import { createPost } from "@/actions/post";
import { uploadFile } from "@/lib/upload";
import type { Media } from "@/lib/utils";
import { useT } from "@/hooks/use-i18n";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MediaEditor } from "./media-editor";

type CreateCtx = { open: () => void };

const CreateDialogContext = React.createContext<CreateCtx>({ open: () => {} });

export const useCreateDialog = () => React.useContext(CreateDialogContext);

export function CreateDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <CreateDialogContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <CreateDialog open={open} onOpenChange={setOpen} />
    </CreateDialogContext.Provider>
  );
}

const FEATURES = [
  { icon: Smile, label: "Emoji" },
  { icon: Sticker, label: "Stiker" },
  { icon: Film, label: "GIF" },
  { icon: Wand2, label: "Filtrlar" },
  { icon: Sparkles, label: "Effektlar" },
];

function CreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = React.useState<"select" | "compose">("select");
  const [files, setFiles] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<Media[]>([]);
  const [caption, setCaption] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [isReel, setIsReel] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [sharing, setSharing] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      // Reset the wizard whenever the dialog closes.
      /* eslint-disable react-hooks/set-state-in-effect */
      setStep("select");
      setFiles([]);
      setPreviews([]);
      setCaption("");
      setLocation("");
      setIsReel(false);
      setIndex(0);
      setSharing(false);
      setDragOver(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open]);

  function handleFiles(list: FileList | null, append = false) {
    if (!list) return;
    const arr = Array.from(list).slice(0, 10);
    if (!arr.length) return;
    const nextPreviews: Media[] = arr.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith("video") ? "video" : "image",
    }));
    if (append) {
      setIndex(previews.length);
      setFiles((prev) => [...prev, ...arr]);
      setPreviews((prev) => [...prev, ...nextPreviews]);
    } else {
      setFiles(arr);
      setPreviews(nextPreviews);
      setIndex(0);
    }
    setStep("compose");
  }

  async function handleShare() {
    setSharing(true);
    try {
      const uploaded: Media[] = [];
      for (let i = 0; i < files.length; i++) {
        const base = await uploadFile(files[i]);
        const preview = previews[i];
        uploaded.push({
          ...base,
          overlays: preview?.overlays,
          edit: preview?.edit,
        });
      }
      const res = await createPost({
        media: uploaded,
        caption,
        location,
        isReel,
      });
      if (!res.ok) {
        void 0;
        return;
      }
      toast.success(t("Joylandi!"));
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      void 0;
    } finally {
      setSharing(false);
    }
  }

  const current = previews[index];
  const composing = step === "compose" && !!current;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl gap-0 overflow-y-auto p-0 sm:h-[90vh] sm:overflow-hidden"
        hideClose
      >
        {!composing ? (
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <span className="text-sm font-bold">{t("Yangi post yaratish")}</span>
              <button
                onClick={() => onOpenChange(false)}
                className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                {t("Yopish")}
              </button>
            </div>

            <div className="p-5 sm:p-8">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={`relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors sm:py-20 ${
                  dragOver
                    ? "border-violet-400 bg-violet-500/5"
                    : "border-border"
                }`}
              >
                <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
                <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 text-white shadow-[0_20px_60px_-20px_rgba(124,58,237,0.9)]">
                  <Images className="h-9 w-9" />
                </span>
                <div className="relative space-y-1">
                  <p className="text-xl font-bold">{t("Rasm yoki video tashlang")}</p>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    {t(
                      "Fayllarni bu yerga sudrab tashlang yoki tanlang. So'ngra emoji, stiker, GIF va effektlar qo'shishingiz mumkin."
                    )}
                  </p>
                </div>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="relative inline-flex h-11 items-center gap-2 rounded-full brand-gradient animated-gradient px-6 text-sm font-bold text-white shadow-[0_14px_36px_-14px_rgba(236,72,153,0.9)] transition hover:brightness-110 active:scale-[0.97]"
                >
                  <ImageIcon className="h-4 w-4" />
                  {t("Media tanlash")}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {FEATURES.map((f) => (
                  <span
                    key={f.label}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    <f.icon className="h-3.5 w-3.5 text-violet-500" />
                    {t(f.label)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:grid sm:h-full sm:grid-cols-[1fr_360px]">
            <MediaEditor
              media={current}
              onChange={(next) =>
                setPreviews((prev) =>
                  prev.map((p, i) => (i === index ? next : p))
                )
              }
              onBack={() => setStep("select")}
            />

            {/* Compose panel */}
            <div className="flex min-h-0 flex-col border-t sm:border-l sm:border-t-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <button
                    onClick={() => setStep("select")}
                    className="sm:hidden"
                    aria-label={t("Orqaga")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  {isReel ? t("Yangi reel") : t("Yangi post")}
                </span>
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full brand-gradient px-4 text-sm font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  {sharing ? t("Yuklanmoqda...") : t("Joylash")}
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={t("Izoh yozing...")}
                  className="min-h-[110px] resize-none border-0 p-0 text-base shadow-none focus-visible:ring-0"
                  maxLength={2200}
                />

                {previews.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {previews.map((p, i) => (
                      <button
                        key={p.url}
                        onClick={() => setIndex(i)}
                        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                          i === index
                            ? "border-violet-500"
                            : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        {p.type === "video" ? (
                          <video
                            src={p.url}
                            className="h-full w-full object-cover"
                            muted
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </button>
                    ))}
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-dashed text-muted-foreground transition hover:text-foreground"
                      aria-label={t("Yana qo'shish")}
                    >
                      <PlusSquare className="h-5 w-5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={t("Joylashuv qo'shish")}
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl border bg-card/60 px-3.5 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Film className="h-4 w-4 text-violet-500" />
                    {t("Reel sifatida joylash")}
                  </span>
                  <Switch checked={isReel} onCheckedChange={setIsReel} />
                </div>

                <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-3.5">
                  <p className="flex items-center gap-2 text-xs font-bold">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    {t("Tahrirlash maslahati")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t(
                      "Elementni bosing va suring. Hajmini, burilishini va harakatini o'zgartiring. Video uchun filtr, tezlik va kesish ham mavjud."
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t px-4 py-3">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  <PlusSquare className="h-4 w-4" />
                  {t("Media qo'shish")}
                </button>
                <span className="text-xs text-muted-foreground">
                  {index + 1}/{previews.length}
                </span>
              </div>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files, composing);
            e.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function CreateButton() {
  const { open } = useCreateDialog();
  const t = useT();
  return (
    <button
      onClick={open}
      className="flex w-full items-center gap-4 rounded-lg p-3 text-sm transition-colors hover:bg-accent"
    >
      <PlusSquare className="h-6 w-6" />
      <span className="hidden lg:inline">{t("Yaratish")}</span>
    </button>
  );
}

export function CreateTabButton() {
  const { open } = useCreateDialog();
  return (
    <button onClick={open} aria-label="Create">
      <PlusSquare className="h-6 w-6" />
    </button>
  );
}
