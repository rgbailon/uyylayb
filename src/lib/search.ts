import type { Item, Medium } from "@/types";
import { languageName } from "@/lib/constants";
import { normalizeName } from "@/lib/utils";

export interface SearchEntry {
  item: Item;
  medium: Medium;
  lower: string;
  norm: string;
  extra: string;
}

const indexCache = new Map<string, SearchEntry[]>();

export function buildIndex(
  medium: Medium,
  items: Item[],
  countryNames: Record<string, string> = {},
): SearchEntry[] {
  const key = `${medium}:${items.length}`;
  const hit = indexCache.get(key);
  if (hit) return hit;
  const built = items.map((item) => ({
    item,
    medium,
    lower: item.name.toLowerCase(),
    norm: normalizeName(item.name),
    extra: `${item.country} ${(countryNames[item.country.toUpperCase()] ?? "").toLowerCase()} ${item.languages
      .map((l) => languageName(l).toLowerCase())
      .join(" ")}`,
  }));
  indexCache.set(key, built);
  return built;
}

export interface SearchHit extends SearchEntry {
  score: number;
}

export function searchIndex(entries: SearchEntry[], rawQuery: string, limit = 60): SearchHit[] {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < 1) return [];
  const qn = normalizeName(q);
  const results: SearchHit[] = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    let score = 0;

    if (e.lower === q || e.norm === qn) score = 1000;
    else if (e.norm.startsWith(qn)) score = 620 - Math.min(80, e.norm.length);
    else if (e.lower.includes(` ${q}`)) score = 440;
    else if (e.norm.includes(qn)) score = 300 - Math.min(60, e.norm.length);
    else if (e.extra.includes(q)) score = 120;

    if (!score) continue;
    if (e.item.sources?.youtube?.length) score += 6;
    if ((e.item.sources?.streams?.length ?? 0) > 1) score += 10;
    if (e.item.isGeoBlocked) score -= 18;
    results.push({ ...e, score });
    if (results.length > 4000) break;
  }

  results.sort((a, b) => b.score - a.score || a.lower.localeCompare(b.lower));
  return results.slice(0, limit);
}
