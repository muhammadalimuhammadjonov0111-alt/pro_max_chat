import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Instagram-style short relative time: 2s, 5m, 3h, 4d, 6w */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 60) return `${Math.max(seconds, 1)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}

/** 1200 -> "1,200"  |  1500000 -> "1.5M" */
export function formatCount(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) {
    const v = n / 1000;
    return `${v % 1 === 0 ? v : v.toFixed(1)}K`;
  }
  const v = n / 1_000_000;
  return `${v % 1 === 0 ? v : v.toFixed(1)}M`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Formats a date as `dd.mm.yyyy` in Uzbekistan time (UTC+5, no DST).
 *
 * Uses a fixed offset instead of `toLocaleDateString` so the value is
 * byte-for-byte identical on the server and in the browser (avoids hydration
 * mismatches caused by differing ICU data / timezones).
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const t = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  const dd = String(t.getUTCDate()).padStart(2, "0");
  const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${t.getUTCFullYear()}`;
}

export type MediaOverlayKind = "emoji" | "sticker" | "text" | "gif";

/** A sticker / emoji / text / GIF pasted on top of a photo or video. */
export type MediaOverlay = {
  id: string;
  kind: MediaOverlayKind;
  /** emoji glyph, text content, or image/GIF url */
  value: string;
  /** center position as a percentage of the media box (0-100) */
  x: number;
  y: number;
  /** size as a percentage of the media's smallest side */
  size: number;
  color?: string;
  /** rotation in degrees */
  rotate?: number;
  /** enter animation */
  animation?: "none" | "pop" | "float" | "pulse" | "spin" | "bounce";
};

/** Non destructive edits applied while rendering the media. */
export type MediaEdit = {
  /** id of a preset from `FILTERS` */
  filter?: string;
  /** video playback rate (0.25 - 2) */
  speed?: number;
  /** trim window in seconds (`trimEnd` = 0 means "until the end") */
  trimStart?: number;
  trimEnd?: number;
  /** start muted (video) */
  muted?: boolean;
};

export type Media = {
  url: string;
  type: "image" | "video";
  overlays?: MediaOverlay[];
  edit?: MediaEdit;
};

export function parseMedia(json: string): Media[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is Record<string, unknown> =>
          !!m &&
          typeof m === "object" &&
          typeof (m as Record<string, unknown>).url === "string"
      )
      .map((m) => ({
        url: String(m.url),
        type: m.type === "video" ? ("video" as const) : ("image" as const),
        overlays: Array.isArray(m.overlays)
          ? (m.overlays as MediaOverlay[])
          : undefined,
        edit:
          m.edit && typeof m.edit === "object"
            ? (m.edit as MediaEdit)
            : undefined,
      }));
  } catch {
    return [];
  }
}
