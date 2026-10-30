import { useEffect, useMemo, useState } from "react";
import type { Item, Medium } from "@/types";
import { CATEGORIES, HOME_ROWS, MEDIA, flagEmoji } from "@/lib/constants";
import { curate, fetchCategory } from "@/lib/catalog";
import { useCountryMeta } from "@/lib/hooks";
import { formatCount } from "@/lib/utils";
import { navigate } from "@/lib/router";
import { useApp } from "@/store/app";
import { Hero, heroStat } from "@/components/Hero";
import { Row } from "@/components/Row";
import { TopTen } from "@/components/TopTen";
import type { DetailTarget } from "@/components/DetailModal";
import { ChevronRight } from "@/components/Icons";

const HERO_CATEGORY: Record<Medium, string> = {
  tv: "top-news",
  radio: "hits",
  webcams: "beach",
};

/** Lighter payload categories used for the cross-medium teasers on the mixed home. */
const TEASER_ROWS: Record<Medium, string[]> = {
  tv: ["top-news", "movies", "sports"],
  radio: ["chill", "jazz", "classical"],
  webcams: ["beach", "animals", "space"],
};

interface Props {
  medium: Medium;
  mixed?: boolean;
  onInfo: (item: Item, medium: Medium, queue: Item[]) => void;
}

function CategoryChips({ medium }: { medium: Medium }) {
  const cats = CATEGORIES[medium];
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      {cats.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => navigate(`/browse/${medium}?category=${c.id}`)}
          className="group flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3.5 py-2 text-xs font-medium text-white/65 transition hover:border-brand-500 hover:bg-brand-500/10 hover:text-white"
        >
          <span className="text-sm">{c.icon}</span>
          {c.label}
        </button>
      ))}
    </div>
  );
}

function CountryStrip({ medium }: { medium: Medium }) {
  const { data } = useCountryMeta(medium);
  const top = useMemo(() => {
    if (!data) return [];
    return Object.entries(data)
      .filter(([, m]) => m.hasChannels)
      .sort((a, b) => b[1].channelCount - a[1].channelCount)
      .slice(0, 24);
  }, [data]);

  if (!top.length) return null;

  return (
    <section className="py-5">
      <div className="mb-3 flex items-end justify-between px-4 sm:px-6 lg:px-10">
        <div>
          <h2 className="font-display text-[17px] font-bold tracking-tight text-white sm:text-xl">
            🌍 Browse by country
          </h2>
          <p className="mt-0.5 text-xs text-white/40">
            {Object.values(data ?? {}).filter((m) => m.hasChannels).length} territories currently
            broadcasting
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/countries")}
          className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-white/60 transition hover:border-brand-500 hover:text-white"
        >
          All countries <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        {top.map(([cc, m]) => (
          <button
            key={cc}
            type="button"
            onClick={() => navigate(`/country/${cc.toLowerCase()}`)}
            className="group relative flex w-[158px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br from-white/6 to-white/[0.02] p-3.5 text-left transition hover:-translate-y-1 hover:border-white/25"
          >
            <span className="text-2xl leading-none drop-shadow">{flagEmoji(cc)}</span>
            <span className="mt-3 block truncate text-[13px] font-semibold text-white/90">
              {m.country}
            </span>
            <span className="text-[11px] text-white/40">{formatCount(m.channelCount)} live feeds</span>
            <span className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-brand-500/0 blur-2xl transition group-hover:bg-brand-500/40" />
          </button>
        ))}
      </div>
    </section>
  );
}

export function Home({ medium, mixed, onInfo }: Props) {
  const { favorites, history } = useApp();
  const [spotlight, setSpotlight] = useState<Item[] | null>(null);
  const { data: meta } = useCountryMeta(medium);

  useEffect(() => {
    let alive = true;
    setSpotlight(null);
    const cat = HERO_CATEGORY[medium];
    fetchCategory(medium, cat)
      .then((list) => {
        if (!alive) return;
        const pool = list.filter(
          (i) => !i.isGeoBlocked && (i.sources.streams?.length || i.sources.youtube?.length),
        );
        const seed = new Date().toISOString().slice(0, 13);
        setSpotlight(curate(pool.length ? pool : list, seed).slice(0, 26));
      })
      .catch(() => alive && setSpotlight([]));
    return () => {
      alive = false;
    };
  }, [medium]);

  const heroItems = useMemo(() => spotlight?.slice(0, 6) ?? null, [spotlight]);
  const topTen = useMemo(() => spotlight?.slice(6, 16) ?? [], [spotlight]);

  const stats = useMemo(() => {
    if (!meta) return undefined;
    const vals = Object.values(meta);
    const total = vals.reduce((a, m) => a + m.channelCount, 0);
    const active = vals.filter((m) => m.hasChannels).length;
    return [
      heroStat(medium === "radio" ? "Stations" : medium === "tv" ? "Channels" : "Live cams", total),
      heroStat("Countries", active),
      { label: "Verified", value: "24/7" },
      { label: "Cost", value: "Free" },
    ];
  }, [meta, medium]);

  const favRow = useMemo(
    () => favorites.filter((f) => (mixed ? true : f.medium === medium)).map((f) => f.item),
    [favorites, medium, mixed],
  );
  const favMedium = favorites[0]?.medium ?? medium;

  const historyRow = useMemo(
    () => history.filter((h) => (mixed ? true : h.medium === medium)).map((h) => h.item),
    [history, medium, mixed],
  );
  const historyMedium = history[0]?.medium ?? medium;

  const rows = HOME_ROWS[medium];
  const cats = CATEGORIES[medium];
  const catOf = (id: string) => cats.find((c) => c.id === id);

  const visibleRows = mixed ? rows.slice(0, 7) : rows;
  const heroLabel = catOf(HERO_CATEGORY[medium])?.label ?? "Featured";

  return (
    <div>
      <Hero
        items={heroItems ?? []}
        medium={medium}
        loading={heroItems === null}
        label={heroLabel}
        onInfo={onInfo}
        stats={stats}
      />

      <div className="relative z-10 -mt-6 space-y-1 pb-10">
        <div className="px-4 pb-2 sm:px-6 lg:px-10">
          <CategoryChips medium={medium} />
        </div>

        <TopTen items={topTen} medium={medium} loading={spotlight === null} onInfo={onInfo} />

        {historyRow.length > 0 && (
          <Row
            title="Continue watching"
            icon="⏱️"
            subtitle="Pick up where you left off"
            medium={historyMedium}
            items={historyRow}
            onInfo={onInfo}
          />
        )}

        {favRow.length > 0 && (
          <Row
            title="My List"
            icon="❤️"
            subtitle="Everything you saved"
            medium={favMedium}
            items={favRow}
            onInfo={onInfo}
            moreHref="/list"
          />
        )}

        {visibleRows.map((id) => {
          const c = catOf(id);
          if (!c) return null;
          return (
            <Row
              key={`${medium}-${id}`}
              title={c.label}
              icon={c.icon}
              subtitle={c.tagline}
              medium={medium}
              category={id}
              onInfo={onInfo}
              moreHref={`/browse/${medium}?category=${id}`}
            />
          );
        })}

        {mixed &&
          (["radio", "webcams"] as Medium[]).map((m) => {
            const def = MEDIA.find((x) => x.id === m)!;
            return (
              <div key={m} className="pt-6">
                <div className="mb-1 flex items-center gap-3 px-4 sm:px-6 lg:px-10">
                  <span className="h-px flex-1 bg-gradient-to-r from-brand-500/50 to-transparent" />
                  <button
                    type="button"
                    onClick={() => navigate(`/${m}`)}
                    className="font-display flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
                  >
                    {def.icon} {def.label} <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <span className="h-px flex-1 bg-gradient-to-l from-iris-500/50 to-transparent" />
                </div>
                {TEASER_ROWS[m].map((id) => {
                  const c = CATEGORIES[m].find((x) => x.id === id);
                  if (!c) return null;
                  return (
                    <Row
                      key={`${m}-${id}`}
                      title={c.label}
                      icon={c.icon}
                      subtitle={c.tagline}
                      medium={m}
                      category={id}
                      onInfo={onInfo}
                      moreHref={`/browse/${m}?category=${id}`}
                    />
                  );
                })}
              </div>
            );
          })}

        <CountryStrip medium={medium} />
      </div>
    </div>
  );
}

export type { DetailTarget };
