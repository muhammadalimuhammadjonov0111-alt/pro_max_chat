"use client";

import * as React from "react";

import type { MediaOverlay } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Renders stickers / emoji / text / GIFs on top of a photo or video.
 *
 * Overlay sizes are stored as a percentage of the media's smallest side, so
 * the layer measures its own box and converts them to pixels. This keeps the
 * position & scale identical everywhere the post is rendered (feed, reels,
 * detail dialog, editor canvas...).
 */
export function OverlayLayer({ overlays }: { overlays?: MediaOverlay[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [base, setBase] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setBase(Math.min(el.clientWidth, el.clientHeight) || 0);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!overlays?.length || base <= 0) {
    return <div ref={ref} className="pointer-events-none absolute inset-0" />;
  }

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      {overlays.map((o) => {
        const px = overlayPx(o.size, base);
        const anim = ANIM_CLASS[o.animation ?? "none"];
        const isImage =
          o.kind === "gif" ||
          (o.kind === "sticker" && o.value.startsWith("http"));
        return (
          <div
            key={o.id}
            className="absolute"
            style={{
              left: `${o.x}%`,
              top: `${o.y}%`,
              transform: `translate(-50%, -50%) rotate(${o.rotate ?? 0}deg)`,
            }}
          >
            <div className={cn("select-none leading-none", anim)}>
              {isImage ? (
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
                    textShadow:
                      o.kind === "text"
                        ? "0 2px 14px rgba(0,0,0,0.6)"
                        : "0 2px 10px rgba(0,0,0,0.28)",
                    display: "inline-block",
                    maxWidth: base * 0.92,
                    textAlign: "center",
                    whiteSpace: o.kind === "text" ? "pre-wrap" : "nowrap",
                  }}
                >
                  {o.value}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const ANIM_CLASS: Record<NonNullable<MediaOverlay["animation"]>, string> = {
  none: "",
  pop: "animate-pop-in",
  float: "animate-float",
  pulse: "animate-pulse-soft",
  spin: "animate-spin-slow",
  bounce: "animate-bounce-soft",
};

/** Converts a stored overlay size (percent of the smallest side) to pixels. */
export function overlayPx(size: number, base: number) {
  return Math.max(10, (size / 100) * base);
}
