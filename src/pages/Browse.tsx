import { useEffect, useMemo, useState } from "react";
import type { Item, Medium } from "@/types";
import { CATEGORIES, MEDIA, flagEmoji, languageName } from "@/lib/constants";
import { fetchCategory, fetchCountry, sourceCount, stableShuffle } from "@/lib/catalog";
import { useCountryMeta, useDebounced, usePagination } from "@/lib/hooks";
import { buildIndex, searchIndex } from "@/lib/search";
import { cn, formatCount } from "@/lib/utils";
import { buildQuery, navigate } from "@/lib/router";
import { useApp } from "@/store/app";
import { ChannelCard } from "@/components/ChannelCard";
import { Close, Grid, Search as SearchIcon } from "@/components/Icons";

interface Props {
  medium: Medium;
  query: URLSearchParams;
  onInfo: (item: Item, medium: Medium, queue: Item[]) => void;
}

type Sort = "relevance" | "name" | "country" | "sources" | "random";

const SORTS: { id: Sort; label: string }[] = [
  { id: "relevance", label: "Curated" },
  { id: "name", label: "A → Z" },
  { id: "country", label: "By country" },
  { id: "sources", label: "Most reliable" },
  { id: "random", label: "Shuffle" },
];

function Select({
  value,
  onChange,
  children,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full border border-white/12 bg-ink-850 py-2 pl-3.5 pr-8 text-xs font-medium text-white/80 outline-none transition hover:border-white/30 focus:border-brand-500"
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path d="m5 9 7 7 7-7" />
      </svg>
    </label>
  );
}

export function Browse({ medium, query, onInfo }: Props) {
  const { settings } = useApp();
  const category = query.get("category") ?? "all";
  const country = query.get("country") ?? "";
  const lang = query.get("lang") ?? "";
  const q = query.get("q") ?? "";
  const sort = (query.get("sort") as Sort) ?? "relevance";

  const [raw, setRaw] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localQ, setLocalQ] = useState(q);
  const debouncedQ = useDebounced(localQ, 220);
  const { data: meta } = useCountryMeta(medium);

  useEffect(() => setLocalQ(q), [q]);

  const setParam = (patch: Record<string, string | undefined>) => {
    const next: Record<string, string | undefined> = {
      category: category === "all" ? undefined : category,
      country: country || undefined,
      lang: lang || undefined,
      q: q || undefined,
      sort: sort === "relevance" ? undefined : sort,
      ...patch,
    };
    navigate(`/browse/${medium}${buildQuery(next)}`, { replace: true });
  };

  useEffect(() => {
    if (debouncedQ !== q) setParam({ q: debouncedQ || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  useEffect(() => {
    let alive = true;
    setRaw(null);
    setError(null);
    const task =
      country && category === "all"
        ? fetchCountry(medium, country)
        : fetchCategory(medium, category);
    task
      .then((d) => alive && setRaw(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [medium, category, country]);

  const countryNames = useMemo(() => {
    const out: Record<string, string> = {};
    if (meta) Object.entries(meta).forEach(([cc, m]) => (out[cc] = m.country));
    return out;
  }, [meta]);

  const languageOptions = useMemo(() => {
    if (!raw) return [];
    const counts = new Map<string, number>();
    raw.forEach((i) => i.languages.forEach((l) => counts.set(l, (counts.get(l) ?? 0) + 1)));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60)
      .map(([code, n]) => ({ code, n }));
  }, [raw]);

  const countryOptions = useMemo(() => {
    if (!raw) return [];
    const counts = new Map<string, number>();
    raw.forEach((i) => counts.set(i.country, (counts.get(i.country) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [raw]);

  const filtered = useMemo(() => {
    if (!raw) return [];
    let list = raw;
    if (country) list = list.filter((i) => i.country === country);
    if (lang) list = list.filter((i) => i.languages.includes(lang));
    if (settings.hideGeoBlocked) list = list.filter((i) => !i.isGeoBlocked);
    if (q.trim()) {
      const hits = searchIndex(buildIndex(medium, list, countryNames), q, 600);
      list = hits.map((h) => h.item);
      if (sort === "relevance") return list;
    }
    switch (sort) {
      case "name":
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      case "country":
        return [...list].sort(
          (a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name),
        );
      case "sources":
        return [...list].sort(
          (a, b) =>
            sourceCount(b) - sourceCount(a) ||
            Number(a.isGeoBlocked) - Number(b.isGeoBlocked) ||
            a.name.localeCompare(b.name),
        );
      case "random":
        return stableShuffle(list, String(Date.now() >> 16), (i) => i.nanoid);
      default:
        return stableShuffle(list, `${medium}${category}${country}${lang}`, (i) => i.nanoid);
    }
  }, [raw, country, lang, q, sort, settings.hideGeoBlocked, medium, category, countryNames]);

  const { slice, sentinel, hasMore, total } = usePagination(filtered, 60);
  const catDef = CATEGORIES[medium].find((c) => c.id === category);
  const mediumDef = MEDIA.find((m) => m.id === medium)!;
  const activeFilters = [country, lang, q].filter(Boolean).length;

  return (
    <div className="px-4 pb-16 pt-24 sm:px-6 lg:px-10">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/35">
          <button onClick={() => navigate(`/${medium}`)} className="transition hover:text-white">
            {mediumDef.label}
          </button>
          <span>/</span>
          <span className="text-white/60">{catDef?.label ?? "All"}</span>
        </div>
        <h1 className="font-display mt-1 flex items-center gap-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          {catDef?.icon && <span>{catDef.icon}</span>}
          {catDef?.label ?? `All ${mediumDef.label}`}
        </h1>
        <p className="mt-1 text-sm text-white/45">
          {catDef?.tagline ?? mediumDef.blurb} ·{" "}
          <span className="text-white/70">{formatCount(total)}</span> result
          {total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="sticky top-16 z-30 -mx-4 mb-6 border-y border-white/8 bg-void/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Filter by name…"
              className="w-full rounded-full border border-white/12 bg-ink-850 py-2 pl-9 pr-8 text-xs text-white outline-none transition focus:border-brand-500"
            />
            {localQ && (
              <button
                type="button"
                onClick={() => setLocalQ("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white"
              >
                <Close className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Select label="Category" value={category} onChange={(v) => setParam({ category: v === "all" ? undefined : v })}>
            <option value="all">All categories</option>
            {CATEGORIES[medium].map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </Select>

          <Select label="Country" value={country} onChange={(v) => setParam({ country: v || undefined })}>
            <option value="">All countries</option>
            {countryOptions.map(([cc, n]) => (
              <option key={cc} value={cc}>
                {countryNames[cc.toUpperCase()] ?? cc.toUpperCase()} ({n})
              </option>
            ))}
          </Select>

          <Select label="Language" value={lang} onChange={(v) => setParam({ lang: v || undefined })}>
            <option value="">All languages</option>
            {languageOptions.map((l) => (
              <option key={l.code} value={l.code}>
                {languageName(l.code)} ({l.n})
              </option>
            ))}
          </Select>

          <Select label="Sort" value={sort} onChange={(v) => setParam({ sort: v as Sort })}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={() => {
                setLocalQ("");
                navigate(`/browse/${medium}${buildQuery({ category: category === "all" ? undefined : category })}`, {
                  replace: true,
                });
              }}
              className="flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-300 transition hover:bg-brand-500/20"
            >
              <Close className="h-3 w-3" /> Clear {activeFilters}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-brand-500/25 bg-brand-500/8 p-6 text-center text-sm text-white/70">
          Could not load this catalogue ({error}). The dataset may be rate-limited — try again shortly.
        </div>
      )}

      {!raw && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton aspect-video w-full rounded-2xl" />
              <div className="skeleton mt-2 h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
      )}

      {raw && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/8 bg-white/2 py-20 text-center">
          <Grid className="h-8 w-8 text-white/20" />
          <p className="text-sm text-white/50">No streams match these filters.</p>
          <button
            type="button"
            onClick={() => navigate(`/browse/${medium}`, { replace: true })}
            className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-brand-500 hover:text-white"
          >
            Reset filters
          </button>
        </div>
      )}

      {slice.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {slice.map((item) => (
              <ChannelCard
                key={item.nanoid}
                item={item}
                medium={medium}
                category={category === "all" ? undefined : category}
                queue={filtered}
                variant="grid"
                onInfo={onInfo}
              />
            ))}
          </div>
          <div ref={sentinel} className="h-20" />
          {hasMore && (
            <p className="pb-6 text-center text-xs text-white/35">
              Showing {slice.length} of {formatCount(total)} — scroll for more
            </p>
          )}
        </>
      )}

      {raw && country && (
        <div className={cn("mt-10 flex justify-center")}>
          <button
            type="button"
            onClick={() => navigate(`/country/${country}`)}
            className="rounded-full border border-white/12 px-5 py-2.5 text-xs font-semibold text-white/60 transition hover:border-brand-500 hover:text-white"
          >
            {flagEmoji(country)} Open the full {countryNames[country.toUpperCase()] ?? country.toUpperCase()} hub →
          </button>
        </div>
      )}
    </div>
  );
}
