import type { CountryMetaMap, Item, Medium, PlaySource } from "@/types";

const CDN = "https://cdn.jsdelivr.net/gh/famelack/famelack-data@main";
const RAW = "https://raw.githubusercontent.com/famelack/famelack-data/main";

const memory = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

async function getJSON<T>(path: string): Promise<T> {
  if (memory.has(path)) return memory.get(path) as T;
  const existing = inflight.get(path);
  if (existing) return existing as Promise<T>;

  const task = (async () => {
    let lastErr: unknown;
    for (const base of [CDN, RAW]) {
      try {
        const res = await fetch(`${base}/${path}`, { cache: "force-cache" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = (await res.json()) as T;
        memory.set(path, data);
        return data;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("Network error");
  })();

  inflight.set(path, task as Promise<unknown>);
  try {
    return await task;
  } finally {
    inflight.delete(path);
  }
}

export function isCached(path: string): boolean {
  return memory.has(path);
}

export const paths = {
  meta: (m: Medium) => `${m}/raw/countries_metadata.json`,
  category: (m: Medium, c: string) => `${m}/raw/categories/${c}.json`,
  country: (m: Medium, cc: string) => `${m}/raw/countries/${cc.toLowerCase()}.json`,
};

export function fetchCountryMeta(medium: Medium): Promise<CountryMetaMap> {
  return getJSON<CountryMetaMap>(paths.meta(medium));
}

export function fetchCategory(medium: Medium, category: string): Promise<Item[]> {
  return getJSON<Item[]>(paths.category(medium, category));
}

export function fetchCountry(medium: Medium, cc: string): Promise<Item[]> {
  return getJSON<Item[]>(paths.country(medium, cc));
}

export function fetchAll(medium: Medium): Promise<Item[]> {
  return fetchCategory(medium, "all");
}

export function categoryCached(medium: Medium, category: string): Item[] | null {
  return (memory.get(paths.category(medium, category)) as Item[] | undefined) ?? null;
}

export function itemKey(medium: Medium, item: Item): string {
  return `${medium}:${item.nanoid}`;
}

/** Resolve a single item from the full catalogue (used for deep links). */
export async function findItem(medium: Medium, nanoid: string): Promise<Item | null> {
  const all = await fetchAll(medium);
  return all.find((i) => i.nanoid === nanoid) ?? null;
}

const YT_ID = /(?:embed\/|v=|youtu\.be\/|live\/)([\w-]{6,})/;

export function youtubeId(url: string): string | null {
  const m = url.match(YT_ID);
  return m ? m[1] : null;
}

export function playSources(item: Item): PlaySource[] {
  const out: PlaySource[] = [];
  const streams = item.sources?.streams ?? [];
  const youtube = item.sources?.youtube ?? [];

  streams.forEach((url, i) => {
    const kind = /\.m3u8(\?|$)/i.test(url) || /m3u8/i.test(url) ? "hls" : "file";
    out.push({
      kind,
      url,
      label: `${kind === "hls" ? "HLS" : "Direct"} source ${i + 1}`,
    });
  });

  youtube.forEach((url, i) => {
    out.push({ kind: "youtube", url, label: `YouTube Live ${youtube.length > 1 ? i + 1 : ""}`.trim() });
  });

  return out;
}

export function primaryKind(item: Item): "hls" | "youtube" | "audio" | "file" {
  if (item.sources?.streams?.length) {
    const url = item.sources.streams[0];
    return /m3u8/i.test(url) ? "hls" : "file";
  }
  if (item.sources?.youtube?.length) return "youtube";
  return "file";
}

export function sourceCount(item: Item): number {
  return (item.sources?.streams?.length ?? 0) + (item.sources?.youtube?.length ?? 0);
}

/** Deterministic pseudo-random for stable "shuffles" per session key. */
export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function stableShuffle<T>(arr: T[], seed: string, keyOf: (x: T) => string): T[] {
  return [...arr].sort((a, b) => (hashString(seed + keyOf(a)) % 100000) - (hashString(seed + keyOf(b)) % 100000));
}

/**
 * Orders a catalogue slice so the most likely-to-play feeds surface first
 * (redundant sources, no geo-block, YouTube fallbacks) while keeping a
 * deterministic shuffle inside each quality tier so rows feel fresh.
 */
export function curate(items: Item[], seed: string): Item[] {
  const score = (i: Item) =>
    (i.isGeoBlocked ? -4 : 0) +
    Math.min(3, i.sources?.streams?.length ?? 0) +
    (i.sources?.youtube?.length ? 2 : 0) +
    (i.languages.length ? 1 : 0);
  return [...items].sort(
    (a, b) =>
      score(b) - score(a) ||
      (hashString(seed + a.nanoid) % 100000) - (hashString(seed + b.nanoid) % 100000),
  );
}
