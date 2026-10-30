import { useEffect, useMemo, useState } from "react";
import type { Item, Medium } from "@/types";
import { fetchCountry, playSources, sourceCount } from "@/lib/catalog";
import { flagEmoji, languageName, MEDIA } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { navigate } from "@/lib/router";
import { useApp } from "@/store/app";
import { useLaunch } from "@/components/ChannelCard";
import { ChannelArt } from "@/components/ChannelArt";
import { Check, Close, Globe, Lock, Play, Plus } from "@/components/Icons";

export interface DetailTarget {
  item: Item;
  medium: Medium;
  queue: Item[];
}

export function DetailModal({ target, onClose }: { target: DetailTarget | null; onClose: () => void }) {
  const { isFavorite, toggleFavorite, pushToast } = useApp();
  const launch = useLaunch();
  const [related, setRelated] = useState<Item[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (target) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  useEffect(() => {
    if (!target) {
      setRelated([]);
      return;
    }
    let alive = true;
    fetchCountry(target.medium, target.item.country)
      .then((list) => {
        if (!alive) return;
        setRelated(list.filter((i) => i.nanoid !== target.item.nanoid).slice(0, 12));
      })
      .catch(() => alive && setRelated([]));
    return () => {
      alive = false;
    };
  }, [target]);

  const sources = useMemo(() => (target ? playSources(target.item) : []), [target]);

  if (!target) return null;
  const { item, medium, queue } = target;
  const fav = isFavorite(medium, item);
  const mediumDef = MEDIA.find((m) => m.id === medium)!;

  return (
    <div
      className="fixed inset-0 z-[60] flex animate-fade items-start justify-center overflow-y-auto bg-black/80 p-0 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative my-0 w-full max-w-3xl animate-pop overflow-hidden rounded-none border border-white/10 bg-ink-900 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] sm:my-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-brand-500"
          aria-label="Close"
        >
          <Close className="h-4 w-4" />
        </button>

        <div className="relative">
          <ChannelArt item={item} medium={medium} big className="aspect-[16/8] w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 rounded bg-brand-500 px-2 py-[3px] text-[9px] font-black uppercase tracking-widest text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
              </span>
              <span className="rounded border border-white/15 bg-black/40 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-wider text-white/70">
                {mediumDef.label}
              </span>
              {item.isGeoBlocked && (
                <span className="flex items-center gap-1 rounded border border-amber-400/30 bg-amber-500/15 px-2 py-[3px] text-[10px] font-semibold text-amber-300">
                  <Lock className="h-3 w-3" /> Region-restricted
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl">
              {item.name}
            </h2>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                launch(item, medium, queue.length ? queue : related);
                onClose();
              }}
              className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black transition hover:scale-[1.03] hover:bg-brand-500 hover:text-white"
            >
              <Play className="h-4 w-4" /> {medium === "radio" ? "Listen live" : "Watch live"}
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(medium, item)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition",
                fav
                  ? "border-brand-500 bg-brand-500/15 text-brand-300"
                  : "border-white/20 text-white hover:border-white",
              )}
            >
              {fav ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {fav ? "In My List" : "My List"}
            </button>
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}#/watch/${medium}/${item.nanoid}`;
                navigator.clipboard?.writeText(url).then(
                  () => pushToast("Deep link copied to clipboard", "success"),
                  () => pushToast("Could not access the clipboard", "warn"),
                );
              }}
              className="rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white hover:text-white"
            >
              Copy link
            </button>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Origin</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-medium text-white/90">
                <span className="text-base">{flagEmoji(item.country)}</span>
                {item.country.toUpperCase()}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Language</dt>
              <dd className="mt-1 font-medium text-white/90">
                {item.languages.length ? item.languages.map(languageName).join(", ") : "Not labelled"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">Sources</dt>
              <dd className="mt-1 font-medium text-white/90">
                {sourceCount(item)} redundant feed{sourceCount(item) === 1 ? "" : "s"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-white/35">ID</dt>
              <dd className="mt-1 font-mono text-xs text-white/60">{item.nanoid}</dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
              Delivery chain
            </h3>
            <ul className="space-y-1.5">
              {sources.map((s, i) => (
                <li
                  key={s.url}
                  className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/3 px-3 py-2"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-white/8 font-mono text-[10px] text-white/60">
                    {i + 1}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                      s.kind === "youtube"
                        ? "bg-red-500/20 text-red-300"
                        : s.kind === "hls"
                          ? "bg-iris-500/20 text-iris-400"
                          : "bg-mint-400/15 text-mint-400",
                    )}
                  >
                    {s.kind}
                  </span>
                  <span className="truncate font-mono text-[11px] text-white/45">{s.url}</span>
                </li>
              ))}
            </ul>
          </div>

          {related.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  <Globe className="h-3 w-3" /> More from {item.country.toUpperCase()}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/country/${item.country}`);
                  }}
                  className="text-[11px] font-semibold text-brand-400 hover:text-brand-300"
                >
                  View country →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {related.slice(0, 6).map((r) => (
                  <button
                    key={r.nanoid}
                    type="button"
                    onClick={() => launch(r, medium, related)}
                    className="group flex items-center gap-2 rounded-xl border border-white/6 p-1.5 text-left transition hover:border-white/20 hover:bg-white/5"
                  >
                    <ChannelArt item={r} medium={medium} className="h-10 w-[64px] shrink-0 rounded-lg" />
                    <span className="truncate text-[11px] font-medium text-white/75 group-hover:text-white">
                      {r.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
