import { useEffect, useMemo, useState } from "react";
import type { Item, Medium } from "@/types";
import { MEDIA, flagEmoji, languageName } from "@/lib/constants";
import { fetchCountry } from "@/lib/catalog";
import { useCountryMeta, usePagination } from "@/lib/hooks";
import { cn, formatClock, formatCount } from "@/lib/utils";
import { navigate } from "@/lib/router";
import { useApp } from "@/store/app";
import { ChannelCard } from "@/components/ChannelCard";
import { Close, Search as SearchIcon } from "@/components/Icons";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function Countries() {
  const tv = useCountryMeta("tv");
  const radio = useCountryMeta("radio");
  const cams = useCountryMeta("webcams");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"total" | "name">("total");
  const now = useClock();

  const rows = useMemo(() => {
    if (!tv.data) return [];
    const codes = new Set([
      ...Object.keys(tv.data),
      ...Object.keys(radio.data ?? {}),
      ...Object.keys(cams.data ?? {}),
    ]);
    const list = [...codes].map((cc) => {
      const base = tv.data![cc] ?? radio.data?.[cc] ?? cams.data?.[cc];
      const counts = {
        tv: tv.data![cc]?.channelCount ?? 0,
        radio: radio.data?.[cc]?.channelCount ?? 0,
        webcams: cams.data?.[cc]?.channelCount ?? 0,
      };
      return {
        cc,
        name: base?.country ?? cc,
        capital: base?.capital ?? "",
        tz: base?.timeZone ?? "UTC",
        counts,
        total: counts.tv + counts.radio + counts.webcams,
      };
    });
    const term = q.trim().toLowerCase();
    const filtered = term
      ? list.filter(
          (r) =>
            r.name.toLowerCase().includes(term) ||
            r.capital.toLowerCase().includes(term) ||
            r.cc.toLowerCase() === term,
        )
      : list;
    return filtered
      .filter((r) => r.total > 0)
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b.total - a.total));
  }, [tv.data, radio.data, cams.data, q, sort]);

  const { slice, sentinel, hasMore } = usePagination(rows, 60);
  const grandTotal = rows.reduce((a, r) => a + r.total, 0);

  return (
    <div className="px-4 pb-16 pt-24 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
            🌍 The world, live
          </h1>
          <p className="mt-1 text-sm text-white/45">
            {rows.length} broadcasting territories · {formatCount(grandTotal)} total feeds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a country…"
              className="w-56 rounded-full border border-white/12 bg-ink-850 py-2 pl-9 pr-8 text-xs text-white outline-none transition focus:border-brand-500"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white"
              >
                <Close className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex rounded-full border border-white/12 p-0.5">
            {(["total", "name"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                  sort === s ? "bg-white text-black" : "text-white/55 hover:text-white",
                )}
              >
                {s === "total" ? "Most feeds" : "A → Z"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!tv.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {slice.map((r) => (
          <button
            key={r.cc}
            type="button"
            onClick={() => navigate(`/country/${r.cc.toLowerCase()}`)}
            className="group relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-white/6 to-white/[0.015] p-4 text-left transition hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_20px_50px_-20px_rgba(255,46,99,0.5)]"
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl leading-none drop-shadow">{flagEmoji(r.cc)}</span>
              <span className="rounded-full bg-black/30 px-2 py-0.5 font-mono text-[10px] text-white/50">
                {formatClock(r.tz, now)}
              </span>
            </div>
            <p className="mt-3 truncate text-sm font-bold text-white/95">{r.name}</p>
            <p className="truncate text-[11px] text-white/35">{r.capital || r.cc.toUpperCase()}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {MEDIA.map((m) =>
                r.counts[m.id] > 0 ? (
                  <span
                    key={m.id}
                    className="rounded-md bg-white/6 px-1.5 py-0.5 text-[10px] font-medium text-white/60"
                  >
                    {m.icon} {formatCount(r.counts[m.id])}
                  </span>
                ) : null,
              )}
            </div>
            <span className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-brand-500/0 blur-2xl transition group-hover:bg-brand-500/35" />
          </button>
        ))}
      </div>
      <div ref={sentinel} className="h-16" />
      {hasMore && <p className="text-center text-xs text-white/30">Scroll for more…</p>}
    </div>
  );
}

export function CountryDetail({
  cc,
  onInfo,
}: {
  cc: string;
  onInfo: (item: Item, medium: Medium, queue: Item[]) => void;
}) {
  const [medium, setMedium] = useState<Medium>("tv");
  const [data, setData] = useState<Record<string, Item[]>>({});
  const [loading, setLoading] = useState(true);
  const { settings } = useApp();
  const tv = useCountryMeta("tv");
  const radio = useCountryMeta("radio");
  const cams = useCountryMeta("webcams");
  const now = useClock();

  const key = cc.toUpperCase();
  const info = tv.data?.[key] ?? radio.data?.[key] ?? cams.data?.[key];

  const counts = {
    tv: tv.data?.[key]?.channelCount ?? 0,
    radio: radio.data?.[key]?.channelCount ?? 0,
    webcams: cams.data?.[key]?.channelCount ?? 0,
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    if (data[`${medium}:${cc}`]) {
      setLoading(false);
      return;
    }
    fetchCountry(medium, cc)
      .then((d) => alive && setData((prev) => ({ ...prev, [`${medium}:${cc}`]: d })))
      .catch(() => alive && setData((prev) => ({ ...prev, [`${medium}:${cc}`]: [] })))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [medium, cc, data]);

  const items = useMemo(() => {
    const list = data[`${medium}:${cc}`] ?? [];
    return settings.hideGeoBlocked ? list.filter((i) => !i.isGeoBlocked) : list;
  }, [data, medium, cc, settings.hideGeoBlocked]);

  const { slice, sentinel, hasMore } = usePagination(items, 60);

  const topLanguages = useMemo(() => {
    const c = new Map<string, number>();
    items.forEach((i) => i.languages.forEach((l) => c.set(l, (c.get(l) ?? 0) + 1)));
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [items]);

  return (
    <div className="pb-16 pt-16">
      <div className="relative overflow-hidden border-b border-white/8 bg-gradient-to-br from-ink-850 via-ink-900 to-void px-4 py-10 sm:px-6 lg:px-10">
        <span className="pointer-events-none absolute -right-10 -top-16 select-none text-[14rem] leading-none opacity-10 blur-[2px]">
          {flagEmoji(cc)}
        </span>
        <button
          type="button"
          onClick={() => navigate("/countries")}
          className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/35 transition hover:text-white"
        >
          ← All countries
        </button>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-5xl leading-none drop-shadow-lg">{flagEmoji(cc)}</span>
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-5xl">
              {info?.country ?? cc.toUpperCase()}
            </h1>
            <p className="mt-1 text-sm text-white/45">
              {info?.capital && <>Capital {info.capital} · </>}
              {info?.timeZone && (
                <>
                  Local time{" "}
                  <span className="font-mono text-white/70">{formatClock(info.timeZone, now)}</span> ·{" "}
                </>
              )}
              {formatCount(counts.tv + counts.radio + counts.webcams)} feeds
            </p>
          </div>
        </div>

        {topLanguages.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {topLanguages.map(([code, n]) => (
              <span
                key={code}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/55"
              >
                {languageName(code)} · {n}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-1.5">
          {MEDIA.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={counts[m.id] === 0}
              onClick={() => setMedium(m.id)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-semibold transition",
                medium === m.id
                  ? "bg-white text-black"
                  : counts[m.id] === 0
                    ? "cursor-not-allowed border border-white/6 text-white/20"
                    : "border border-white/12 text-white/60 hover:border-white/35 hover:text-white",
              )}
            >
              {m.icon} {m.label}
              <span className="ml-1.5 opacity-60">{formatCount(counts[m.id])}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-8 sm:px-6 lg:px-10">
        {loading && !items.length && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton aspect-video rounded-2xl" />
            ))}
          </div>
        )}
        {!loading && items.length === 0 && (
          <p className="py-20 text-center text-sm text-white/40">
            No {medium} feeds listed for this country yet.
          </p>
        )}
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {slice.map((item) => (
            <ChannelCard
              key={item.nanoid}
              item={item}
              medium={medium}
              queue={items}
              variant="grid"
              onInfo={onInfo}
            />
          ))}
        </div>
        <div ref={sentinel} className="h-16" />
        {hasMore && <p className="text-center text-xs text-white/30">Scroll for more…</p>}
      </div>
    </div>
  );
}
