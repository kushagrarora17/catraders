import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during SSR and the hydration render, true afterwards. Gate anything
 * derived from browser state (e.g. the persisted quote cart) on it to avoid
 * hydration mismatches, and form submits so they can't fire before React handles them.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
