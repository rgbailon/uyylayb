import { useMemo, useState } from "react";
import type { Item, Medium } from "@/types";
import { MEDIA } from "@/lib/constants";
import { cn, formatCount, timeAgo } from "@/lib/utils";
import { navigate } from "@/lib/router";
import { useApp } from "@/store/app";
import { ChannelCard, useLaunch } from "@/components/ChannelCard";
import { ChannelArt } from "@/components/ChannelArt";
import { Heart, Play } from "@/components/Icons";

type Tab = "all" | Medium;

export function MyList({
  onInfo,
}: {
  onInfo: (item: Item, medium: Medium, queue: Item[]) => void;
}) {
  const { favorites, history, clearHistory, toggleFavorite } = useApp();
  const [tab, setTab] = useState<Tab>("all");
  const launch = useLaunch();

  const shown = useMemo(
    () => (tab === "all" ? favorites : favorites.filter((f) => f.medium === tab)),
    [favorites, tab],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: favorites.length };
    MEDIA.forEach((m) => (c[m.id] = favorites.filter((f) => f.medium === m.id).length));
    return c;
  }, [favorites]);

  return (
    <div className="px-4 pb-16 pt-24 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display flex items-center gap-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            <Heart className="h-7 w-7 text-brand-500" /> My List
          </h1>
          <p className="mt-1 text-sm text-white/45">
            {formatCount(favorites.length)} saved feed{favorites.length === 1 ? "" : "s"} · stored
            locally on this device
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...MEDIA.map((m) => m.id)] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-3.5 py-2 text-xs font-semibold transition",
                tab === t
                  ? "bg-white text-black"
                  : "border border-white/12 text-white/55 hover:border-white/35 hover:text-white",
              )}
            >
              {t === "all" ? "Everything" : MEDIA.find((m) => m.id === t)!.label}
              <span className="ml-1.5 opacity-55">{counts[t] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-white/12 py-24 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5">
            <Heart className="h-6 w-6 text-white/30" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-white">Nothing saved yet</p>
            <p className="mt-1 max-w-sm text-sm text-white/40">
              Hit the <span className="text-white/70">+</span> on any channel, station or webcam and it
              will live here — on every visit, offline-safe, no account needed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/tv")}
            className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-brand-500 hover:text-white"
          >
            Start exploring
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {shown.map((f) => (
            <ChannelCard
              key={f.key}
              item={f.item}
              medium={f.medium}
              queue={shown.map((x) => x.item)}
              variant="grid"
              onInfo={onInfo}
            />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <section className="mt-16">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight text-white">
                ⏱️ Recently played
              </h2>
              <p className="text-xs text-white/40">Your last {history.length} tune-ins</p>
            </div>
            <button
              type="button"
              onClick={clearHistory}
              className="rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-semibold text-white/50 transition hover:border-brand-500 hover:text-white"
            >
              Clear history
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {history.map((h) => (
              <div
                key={h.key}
                className="group flex items-center gap-3 rounded-2xl border border-white/8 bg-white/2 p-2 transition hover:border-white/20"
              >
                <ChannelArt item={h.item} medium={h.medium} className="h-12 w-[84px] shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-white/90">{h.item.name}</p>
                  <p className="truncate text-[11px] text-white/35">
                    {MEDIA.find((m) => m.id === h.medium)?.label} · {timeAgo(h.at)}
                    {h.count && h.count > 1 ? ` · ${h.count}×` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFavorite(h.medium, h.item)}
                  className="hidden h-8 w-8 place-items-center rounded-full text-white/35 transition hover:text-brand-400 group-hover:grid"
                  aria-label="Save"
                >
                  <Heart className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => launch(h.item, h.medium, history.map((x) => x.item))}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-brand-500"
                  aria-label="Play"
                >
                  <Play className="h-3.5 w-3.5 translate-x-[1px]" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
