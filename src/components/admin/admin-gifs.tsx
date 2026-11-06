"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clapperboard, Loader2, Plus, Trash2 } from "lucide-react";

import { addAdminGif, deleteAdminGif, type AdminGifItem } from "@/actions/admin-gifs";
import { uploadFile } from "@/lib/upload";
import { useT } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export function AdminGifsPanel({ gifs }: { gifs: AdminGifItem[] }) {
  const t = useT();
  const router = useRouter();
  const [uploading, setUploading] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    try {
      const media = await uploadFile(file);
      const res = await addAdminGif({
        url: media.url,
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 120),
      });
      if (!res.ok) {
        void 0;
      } else {
        toast.success(t("GIF qo'shildi"));
        router.refresh();
      }
    } catch (err) {
      void 0;
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t("GIFni o'chirishni xohlaysizmi?"))) return;
    setBusy(id);
    try {
      const res = await deleteAdminGif(id);
      if (!res.ok) void 0;
      else {
        toast.success(t("O'chirildi"));
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c13584]/10 text-[#c13584]">
            <Clapperboard className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold leading-5">{t("GIF'lar")}</p>
            <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
              {t("O'zingizning GIFlaringizni yuklang — ular barcha uchun GIF tanlagichida ko'rinadi.")}
            </p>
          </div>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-full bg-[#c13584] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a92e74] disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t("GIF yuklash")}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/gif,image/webp,.gif,.webp"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {gifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-10 text-center">
          <Clapperboard className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">{t("Hali GIF yo'q")}</p>
          <p className="text-xs text-muted-foreground">
            {t("GIF yuklang — ular GIF tanlagichida ham ko'rinadi.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {gifs.map((gif) => (
            <div
              key={gif.id}
              className="group overflow-hidden rounded-2xl border bg-card"
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gif.url}
                  alt={gif.title || "GIF"}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => void remove(gif.id)}
                  disabled={busy === gif.id}
                  aria-label={t("O'chirish")}
                  className={cn(
                    "absolute end-1.5 top-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-100 backdrop-blur transition hover:bg-red-600",
                    "disabled:opacity-50"
                  )}
                >
                  {busy === gif.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p
                className="truncate px-2 py-1.5 text-[11px] text-muted-foreground"
                title={gif.title || gif.url}
              >
                {gif.title || gif.url.split("/").pop()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
