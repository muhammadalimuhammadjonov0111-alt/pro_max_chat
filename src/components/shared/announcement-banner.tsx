"use client";

import * as React from "react";
import { Info, AlertTriangle, CheckCircle2, X, Megaphone } from "lucide-react";

import { useT } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export type BannerAnnouncement = {
  id: string;
  title: string;
  body: string;
  level: string;
  createdAt: string;
};

const STYLES: Record<
  string,
  { wrap: string; icon: React.ComponentType<{ className?: string }> }
> = {
  info: {
    wrap: "border-blue-500/25 bg-gradient-to-r from-blue-500/10 to-indigo-500/10",
    icon: Info,
  },
  warning: {
    wrap: "border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-orange-500/10",
    icon: AlertTriangle,
  },
  success: {
    wrap: "border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 to-teal-500/10",
    icon: CheckCircle2,
  },
};

export function AnnouncementBanner({
  announcements,
}: {
  announcements: BannerAnnouncement[];
}) {
  const t = useT();
  const [dismissed, setDismissed] = React.useState<string[]>([]);

  React.useEffect(() => {
    let active = true;
    const frame = requestAnimationFrame(() => {
      if (!active) return;
      try {
        const raw = localStorage.getItem("gg-dismissed-announcements");
        if (raw) setDismissed(JSON.parse(raw) as string[]);
      } catch {
        /* ignore */
      }
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, []);

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(
        "gg-dismissed-announcements",
        JSON.stringify(next.slice(-30))
      );
    } catch {
      /* ignore */
    }
  }

  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const a = visible[0];
  const style = STYLES[a.level] ?? STYLES.info;
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "animate-fade-in-up relative mb-4 flex items-start gap-3 overflow-hidden rounded-2xl border p-4 card-shadow",
        style.wrap
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/70">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <Megaphone className="h-3.5 w-3.5 opacity-60" />
          {a.title}
        </p>
        <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">
          {a.body}
        </p>
      </div>
      <button
        onClick={() => dismiss(a.id)}
        aria-label={t("Yopish")}
        className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
