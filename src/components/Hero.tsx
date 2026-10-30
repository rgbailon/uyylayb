import { useEffect, useMemo, useState } from "react";
import type { Item, Medium } from "@/types";
import { artFor, cn, formatCount } from "@/lib/utils";
import { flagEmoji, languageName } from "@/lib/constants";
import { sourceCount } from "@/lib/catalog";
import { useApp } from "@/store/app";
import { useLaunch } from "@/components/ChannelCard";
import { useLogo } from "@/components/ChannelArt";
import { getPhotoThumbnail, getYoutubeThumbnail } from "@/lib/thumbnails";
import { useSwipe } from "@/lib/useSwipe";
import { Check, Info, Lock, Play, Plus } from "@/components/Icons";

interface Props {
  items: Item[];
  medium: Medium;
  loading?: boolean;
  label: string;
  onInfo: (item: Item, medium: Medium, queue: Item[]) => void;
  stats?: { label: string; value: string }[];
}

function HeroArt({ item, medium }: { item: Item; medium?: Medium }) {
  const logo = useLogo(item);
  const [logoFailed, setLogoFailed] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [ytFailed, setYtFailed] = useState(false);

  const art = useMemo(() => artFor(item.nanoid + item.name), [item.nanoid, item.name]);

  const ytThumb = useMemo(() => getYoutubeThumbnail(item, true), [item]);
  const photoThumb = useMemo(() => getPhotoThumbnail(item, medium, undefined, 1280), [item, medium]);
  const heroPic = (!ytFailed && ytThumb) ? ytThumb : photoThumb;

  useEffect(() => {
    setLogoFailed(false);
    setPhotoFailed(false);
    setPhotoLoaded(false);
    setYtFailed(false);
  }, [item.nanoid, logo]);

  return (
    <div key={item.nanoid} className="absolute inset-0 animate-fade overflow-hidden bg-void">
      {/* Fallback colored ambient gradient */}
      <div className="absolute inset-0" style={{ background: art.background }} />

      {/* Main full-bleed high-res photograph / live thumbnail */}
      {heroPic && !photoFailed && (
        <img
          src={heroPic}
          alt={item.name}
          onLoad={() => setPhotoLoaded(true)}
          onError={() => { if (!ytFailed && ytThumb) setYtFailed(true); else setPhotoFailed(true); }}
          fetchPriority="high"
          decoding="async"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-all duration-[1200ms] ease-out",
            photoLoaded ? "opacity-60 scale-100" : "opacity-0 scale-105",
          )}
        />
      )}

      {/* Large logo showcase on right side */}
      {logo && !logoFailed && (
        <div className="absolute right-[8%] top-1/2 hidden max-w-[34%] -translate-y-1/2 lg:flex items-center justify-center rounded-3xl bg-black/40 p-6 backdrop-blur-xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
          <img
            src={logo}
            alt=""
            onError={() => setLogoFailed(true)}
            className="max-h-[160px] max-w-[280px] object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.7)]"
          />
        </div>
      )}

      {/* Cinematic Vignettes */}
      <div className="absolute inset-0 bg-gradient-to-r from-void via-void/85 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-void via-void/70 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-void/90 via-void/40 to-transparent" />
      <div className="grain absolute inset-0" />
    </div>
  );
}

export function Hero({ items, medium, loading, label, onInfo, stats }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const launch = useLaunch();
  const { isFavorite, toggleFavorite } = useApp();

  const featured = useMemo(() => items.slice(0, 6), [items]);

  useEffect(() => setIdx(0), [items]);

  useEffect(() => {
    if (paused || featured.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % featured.length), 9000);
    return () => clearInterval(t);
  }, [paused, featured.length]);

  const item = featured[idx];
  const swipe = useSwipe({
    onLeft: () => featured.length > 1 && setIdx((i) => (i + 1) % featured.length),
    onRight: () => featured.length > 1 && setIdx((i) => (i - 1 + featured.length) % featured.length),
  });

  if (loading || !item) {
    return (
      <section className="relative flex h-[62vh] min-h-[460px] items-end overflow-hidden">
        <div className="skeleton absolute inset-0" />
        <div className="relative z-10 w-full space-y-4 px-4 pb-20 sm:px-6 lg:px-10">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-12 w-2/3 max-w-xl rounded" />
          <div className="skeleton h-4 w-1/2 max-w-md rounded" />
          <div className="flex gap-2 pt-2">
            <div className="skeleton h-11 w-36 rounded-full" />
            <div className="skeleton h-11 w-32 rounded-full" />
          </div>
        </div>
      </section>
    );
  }

  const fav = isFavorite(medium, item);

  return (
    <section
      className="relative flex h-[66vh] min-h-[480px] touch-pan-y items-end overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true);
        swipe.onTouchStart(e);
      }}
      onTouchEnd={(e) => {
        swipe.onTouchEnd(e);
        setPaused(false);
      }}
      onTouchCancel={swipe.onTouchCancel}
    >
      <HeroArt item={item} medium={medium} />

      <div className="relative z-10 w-full px-4 pb-14 sm:px-6 lg:px-10">
        <div className="max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-brand-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              On air now
            </span>
            <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur">
              {label}
            </span>
            {item.isGeoBlocked && (
              <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-300">
                <Lock className="h-3 w-3" /> Region-locked
              </span>
            )}
          </div>

          <h1 className="font-display text-4xl font-black leading-[0.95] tracking-tighter text-white drop-shadow-[0_6px_30px_rgba(0,0,0,0.7)] sm:text-6xl lg:text-7xl">
            {item.name}
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
            Streaming live from{" "}
            <span className="font-semibold text-white/90">
              {flagEmoji(item.country)} {item.country.toUpperCase()}
            </span>
            {item.languages.length > 0 && (
              <>
                {" "}
                in{" "}
                <span className="font-semibold text-white/90">
                  {item.languages.map(languageName).join(", ")}
                </span>
              </>
            )}
            . {sourceCount(item)} verified feed{sourceCount(item) === 1 ? "" : "s"} with automatic
            failover — press play and you are there.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => launch(item, medium, items)}
              className="flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black shadow-xl shadow-black/40 transition hover:scale-[1.03] hover:bg-brand-500 hover:text-white"
            >
              <Play className="h-4 w-4" /> {medium === "radio" ? "Listen" : "Watch"} live
            </button>
            <button
              type="button"
              onClick={() => onInfo(item, medium, items)}
              className="flex items-center gap-2 rounded-full border border-white/25 bg-black/35 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-white hover:bg-black/60"
            >
              <Info className="h-4 w-4" /> Details
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(medium, item)}
              className={cn(
                "grid h-11 w-11 place-items-center rounded-full border backdrop-blur transition hover:scale-105",
                fav
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-white/25 bg-black/35 text-white hover:border-white",
              )}
              aria-label="Toggle My List"
            >
              {fav ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>

          {featured.length > 1 && (
            <div className="mt-7 flex items-center gap-2">
              {featured.map((f, i) => (
                <button
                  key={f.nanoid}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Show ${f.name}`}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    i === idx ? "w-10 bg-brand-500" : "w-5 bg-white/25 hover:bg-white/50",
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {stats && stats.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/8 pt-5">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-display text-xl font-black tracking-tight text-white sm:text-2xl">
                  {s.value}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function heroStat(label: string, n: number) {
  return { label, value: formatCount(n) };
}

