import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during SSR and the hydration render, true afterwards. Gate anything
 * derived from the persisted (localStorage) quote cart on it to avoid
 * hydration mismatches.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
