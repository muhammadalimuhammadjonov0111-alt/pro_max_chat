"use client";

import * as React from "react";

/**
 * Global sound preference for every video surface (feed cards, the post detail
 * dialog and the Reels player). Toggling it from one place updates them all,
 * so users don't have to mute each post one by one.
 */
let muted = true;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return muted;
}

export function setVideoMuted(value: boolean) {
  if (muted === value) return;
  muted = value;
  listeners.forEach((listener) => listener());
}

export function toggleVideoMuted() {
  setVideoMuted(!muted);
}

/** Subscribes a component to the shared mute state. */
export function useVideoMuted() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
