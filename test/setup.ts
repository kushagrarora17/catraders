import { mock } from "bun:test";

// `server-only` throws when imported outside a React Server Components bundle.
// Tests exercise server modules directly, so replace it with a no-op.
mock.module("server-only", () => ({}));

// Minimal in-memory Web Storage so the persisted Zustand store works under Bun.
if (typeof globalThis.localStorage === "undefined") {
  const data = new Map<string, string>();
  globalThis.localStorage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  } satisfies Storage;
}
