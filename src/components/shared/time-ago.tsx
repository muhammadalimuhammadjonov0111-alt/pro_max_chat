"use client";

import { useMounted } from "@/hooks/use-mounted";
import { useT } from "@/hooks/use-i18n";

function formatTimeAgo(
  date: Date | string,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 60) return t("{n}s", { n: Math.max(seconds, 1) });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("{n}m", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("{n}h", { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("{n}d", { n: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return t("{n}w", { n: weeks });
  const months = Math.floor(days / 30);
  if (months < 12) return t("{n}mo", { n: months });
  const years = Math.floor(days / 365);
  return t("{n}y", { n: years });
}

export function TimeAgo({ date, className }: { date: Date | string; className?: string }) {
  const mounted = useMounted();
  const t = useT();
  if (!mounted) return <span className={className}>&nbsp;</span>;
  return <span className={className}>{formatTimeAgo(date, t)}</span>;
}
