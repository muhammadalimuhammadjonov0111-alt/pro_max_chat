"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";

import { useT } from "@/hooks/use-i18n";
import { listAdminGifs } from "@/actions/admin-gifs";

type GifItem = {
  id: string;
  url: string;
  preview: string;
  width: number;
  height: number;
  title: string;
};

export function GifPicker({
  onPick,
  className,
}: {
  onPick: (gif: GifItem) => void;
  className?: string;
}) {
  const t = useT();
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<GifItem[]>([]);
  const [adminItems, setAdminItems] = React.useState<GifItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const reqIdRef = React.useRef(0);

  // Admin-curated GIFs, loaded once — shown pinned at the top.
  React.useEffect(() => {
    let cancelled = false;
    void listAdminGifs()
      .then((rows) => {
        if (cancelled) return;
        setAdminItems(
          rows.map((g) => ({
            id: g.id,
            url: g.url,
            preview: g.url,
            width: 0,
            height: 0,
            title: g.title || "GIF",
          }))
        );
      })
      .catch(() => {
        /* picker still works with Tenor results */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced fetch, latest-request-wins (older responses get discarded).
  React.useEffect(() => {
    const id = ++reqIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/gifs?q=${encodeURIComponent(query.trim())}`
        );
        const data = await res.json();
        if (id !== reqIdRef.current) return;
        if (!res.ok) {
          setError(data.error ? t(data.error) : t("GIFlarni yuklab bo'lmadi"));
          setItems([]);
        } else {
          setItems(data.items ?? []);
        }
      } catch {
        if (id === reqIdRef.current) {
          setError(t("Tarmoq xatosi"));
          setItems([]);
        }
      } finally {
        if (id === reqIdRef.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const q = query.trim().toLowerCase();
  const visibleAdmin = adminItems.filter(
    (g) => !q || g.title.toLowerCase().includes(q)
  );

  const renderTile = (g: GifItem, cols: string) => (
    <button
      key={g.id}
      type="button"
      onClick={() => onPick(g)}
      title={g.title || "GIF"}
      className={`group overflow-hidden rounded-lg bg-muted transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring ${cols}`}
      style={{ aspectRatio: "1 / 1" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={g.preview}
        alt={g.title || "GIF"}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </button>
  );

  return (
    <div
      className={
        "flex h-72 w-full flex-col overflow-hidden rounded-2xl border bg-popover card-shadow " +
        (className ?? "")
      }
    >
      {/* Search */}
      <div className="relative border-b p-2">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("GIF qidirish...")}
          className="h-8 w-full rounded-lg bg-muted pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Grid */}
      <div className="thin-scroll flex-1 overflow-y-auto p-2">
        {/* Admin-curated GIFs pinned to the top */}
        {visibleAdmin.length > 0 && (
          <div className="mb-2">
            <p className="px-0.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("Admin")}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {visibleAdmin.map((g) => renderTile(g, ""))}
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {error}
          </p>
        ) : items.length === 0 ? (
          visibleAdmin.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">
              {t("Hech narsa topilmadi")}
            </p>
          )
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {items.map((g) => renderTile(g, ""))}
          </div>
        )}
      </div>

      <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        {t("Tenor + Admin")}
      </div>
    </div>
  );
}
