import type HlsClass from "hls.js";

/**
 * hls.js is ~1.3 MB unminified source and only needed once something plays, so it
 * is no longer bundled. It's fetched from jsDelivr on demand and pre-warmed during
 * idle time after first paint, so by the time someone presses play it's usually cached.
 */
const HLS_URL = "https://cdn.jsdelivr.net/npm/hls.js@1.6.17/dist/hls.mjs";

export type Hls = HlsClass;
export type HlsCtor = typeof HlsClass;

let pending: Promise<HlsCtor | null> | null = null;

/** Resolves to the Hls constructor, or null if it can't be loaded (native HLS is then tried). */
export function loadHls(): Promise<HlsCtor | null> {
  if (!pending) {
    pending = import(/* @vite-ignore */ HLS_URL)
      .then((m: { default: HlsCtor }) => m.default)
      .catch(() => {
        pending = null;
        return null;
      });
  }
  return pending;
}

export function prefetchHls() {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  const run = () => void loadHls();
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
  else window.setTimeout(run, 2500);
}
