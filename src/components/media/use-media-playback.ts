"use client";

import * as React from "react";

import type { MediaEdit } from "@/lib/utils";

/**
 * Applies non destructive video edits (speed + trim window) to a `<video>`.
 *
 * `trimEnd` of 0 / undefined means "play until the end". When the playhead
 * passes the trim end it loops back to the trim start, so trimmed reels loop
 * smoothly without any server side processing.
 */
export function useMediaPlayback(
  ref: React.RefObject<HTMLVideoElement | null>,
  edit?: MediaEdit
) {
  const speed = edit?.speed ?? 1;
  const start = edit?.trimStart ?? 0;
  const end = edit?.trimEnd ?? 0;

  React.useEffect(() => {
    const v = ref.current;
    if (v) v.playbackRate = speed;
  }, [ref, speed]);

  React.useEffect(() => {
    const v = ref.current;
    if (!v) return;

    function syncStart() {
      if (!v) return;
      if (start > 0 && v.currentTime < start) v.currentTime = start;
    }

    function onTimeUpdate() {
      if (!v) return;
      if (end > 0 && v.currentTime >= end) {
        v.currentTime = start;
      }
    }

    v.addEventListener("loadedmetadata", syncStart);
    v.addEventListener("timeupdate", onTimeUpdate);
    if (v.readyState >= 1) syncStart();

    return () => {
      v.removeEventListener("loadedmetadata", syncStart);
      v.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [ref, start, end]);
}
