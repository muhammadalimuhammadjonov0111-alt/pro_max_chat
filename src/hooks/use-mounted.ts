"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Returns false during SSR and the first client render, then true.
 * Useful to avoid hydration mismatches for client-only values (e.g. theme).
 * Implemented with useSyncExternalStore so it does not call setState in an effect.
 */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
