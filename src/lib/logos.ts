import { loosenName, normalizeName } from "@/lib/utils";

/**
 * Optional channel-logo enrichment from the open iptv-org logo index.
 *
 * Performance design:
 *  - Only logos.json is fetched (channel ids already encode name + country,
 *    e.g. "002RadioTV.do"), halving the old 1.9 MB download.
 *  - Parsing + indexing 35k records runs in a Web Worker, so the main thread
 *    (scrolling, animations) is never blocked.
 *  - The finished index is cached in IndexedDB for a day, so return visits
 *    don't hit the network or the parser at all.
 */

const LOGOS_URL = "https://iptv-org.github.io/api/logos.json";
const DB_NAME = "uyylayb-cache";
const STORE = "kv";
const KEY = "logo-index-v2";
const MAX_AGE = 24 * 60 * 60 * 1000;

let index: Map<string, string> | null = null;
let loading: Promise<Map<string, string>> | null = null;
const listeners = new Set<() => void>();

export function subscribeLogos(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function logoIndexReady(): boolean {
  return index !== null;
}

/* ------------------------------------------------------------ worker */

// Self-contained worker source (the app ships as a single HTML file, so we use a Blob URL).
const WORKER_SRC = `
const norm = (s) => s.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase()
  .replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
const loose = (s) => { let n = norm(s); for (let i = 0; i < 2; i++) n = n.replace(/(uhd|fhd|hd|sd|4k|1080p?|720p?|480p?)$/, ""); return n; };
const score = (l) => (l.in_use ? 50 : 0) + (l.feed ? 0 : 20)
  + ({ PNG: 12, SVG: 8, WEBP: 6 }[(l.format || "").toUpperCase()] || 0)
  + ((l.width >= 200 && l.width <= 900) ? 10 : l.width > 900 ? 4 : 0);
self.onmessage = async (e) => {
  try {
    const res = await fetch(e.data, { cache: "force-cache" });
    const logos = await res.json();
    const best = new Map();
    for (const l of logos) {
      if (!l.url || !l.channel) continue;
      const s = score(l);
      const prev = best.get(l.channel);
      if (!prev || s > prev[0]) best.set(l.channel, [s, l.url]);
    }
    const out = new Map();
    const put = (k, v) => { if (k.length > 1 && !out.has(k)) out.set(k, v); };
    for (const [id, [, url]] of best) {
      const dot = id.lastIndexOf(".");
      const name = dot > 0 ? id.slice(0, dot) : id;
      const cc = dot > 0 ? id.slice(dot + 1).toLowerCase() : "";
      put(norm(name) + "|" + cc, url);
      put(loose(name) + "|" + cc, url);
      put(norm(name), url);
      put(loose(name), url);
    }
    self.postMessage({ ok: true, entries: [...out] });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};`;

function buildInWorker(): Promise<[string, string][]> {
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
    const worker = new Worker(blobUrl);
    const done = () => {
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
    };
    worker.onmessage = (e: MessageEvent<{ ok: boolean; entries?: [string, string][]; error?: string }>) => {
      done();
      if (e.data.ok && e.data.entries) resolve(e.data.entries);
      else reject(new Error(e.data.error || "logo index failed"));
    };
    worker.onerror = (e) => {
      done();
      reject(new Error(e.message));
    };
    worker.postMessage(LOGOS_URL);
  });
}

/* ------------------------------------------------------------ cache */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readCache(): Promise<[string, string][] | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
      req.onsuccess = () => {
        const v = req.result as { at: number; entries: [string, string][] } | undefined;
        resolve(v && Date.now() - v.at < MAX_AGE ? v.entries : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function writeCache(entries: [string, string][]) {
  try {
    const db = await openDb();
    db.transaction(STORE, "readwrite").objectStore(STORE).put({ at: Date.now(), entries }, KEY);
  } catch {
    /* private mode / quota — index just won't persist */
  }
}

/* ------------------------------------------------------------- api */

async function build(): Promise<Map<string, string>> {
  const cached = await readCache();
  if (cached) return new Map(cached);
  const entries = await buildInWorker();
  void writeCache(entries);
  return new Map(entries);
}

export function ensureLogoIndex(): Promise<Map<string, string>> {
  if (index) return Promise.resolve(index);
  if (loading) return loading;
  loading = build()
    .catch(() => new Map<string, string>())
    .then((m) => {
      index = m;
      listeners.forEach((fn) => fn());
      return m;
    });
  return loading;
}

export function lookupLogo(name: string, country: string): string | null {
  if (!index) return null;
  const cc = country.toLowerCase();
  const exact = normalizeName(name);
  const loose = loosenName(name);
  return (
    index.get(`${exact}|${cc}`) ??
    index.get(`${loose}|${cc}`) ??
    index.get(exact) ??
    index.get(loose) ??
    null
  );
}

/* ------------------------------------------- tiny external stores
 * Thumbnails subscribe to these instead of the whole app context, so a toast,
 * favourite or player change no longer re-renders hundreds of cards. */
let logoVersion = 0;
subscribeLogos(() => {
  logoVersion += 1;
});
export const getLogoVersion = () => logoVersion;

let artworkEnabled = true;
const artworkListeners = new Set<() => void>();
export function setArtworkEnabled(on: boolean) {
  if (on === artworkEnabled) return;
  artworkEnabled = on;
  artworkListeners.forEach((fn) => fn());
}
export const getArtworkEnabled = () => artworkEnabled;
export function subscribeArtwork(fn: () => void): () => void {
  artworkListeners.add(fn);
  return () => artworkListeners.delete(fn);
}
