import type { Item, Medium } from "@/types";
import { ChannelArt } from "@/components/ChannelArt";
import { useLaunch } from "@/components/ChannelCard";
import { flagEmoji } from "@/lib/constants";
import { useApp } from "@/store/app";
import { Check, Info, Play, Plus } from "@/components/Icons";

interface Props {
  items: Item[];
  medium: Medium;
  loading?: boolean;
  onInfo: (item: Item, medium: Medium, queue: Item[]) => void;
}

export function TopTen({ items, medium, loading, onInfo }: Props) {
  const launch = useLaunch();
  const { isFavorite, toggleFavorite } = useApp();
  const list = items.slice(0, 10);

  if (!loading && list.length === 0) return null;

  return (
    <section className="py-5">
      <div className="mb-3 px-4 sm:px-6 lg:px-10">
        <h2 className="font-display flex items-center gap-2 text-[17px] font-bold tracking-tight text-white sm:text-xl">
          <span className="rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
            Top 10
          </span>
          Trending in your feed today
        </h2>
        <p className="mt-0.5 text-xs text-white/40">
          Ranked by stream redundancy, availability and reach — refreshed hourly
        </p>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex shrink-0 items-end gap-1">
                <div className="skeleton h-[150px] w-[62px] rounded" />
                <div className="skeleton h-[220px] w-[150px] rounded-2xl" />
              </div>
            ))
          : list.map((item, i) => {
              const fav = isFavorite(medium, item);
              return (
                <div key={item.nanoid} className="group/top flex shrink-0 items-end">
                  <span
                    aria-hidden
                    className="font-display -mr-5 select-none text-[130px] font-black leading-[0.72] tracking-tighter text-transparent transition-all duration-300 group-hover/top:text-brand-500/20"
                    style={{ WebkitTextStroke: "2px rgba(255,255,255,0.22)" }}
                  >
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onInfo(item, medium, items)}
                    className="relative aspect-[2/3] w-[150px] overflow-hidden rounded-2xl border border-white/8 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-white/25 hover:shadow-[0_26px_60px_-18px_rgba(255,46,99,0.5)]"
                  >
                    <ChannelArt item={item} medium={medium} className="h-full w-full" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5">
                      <p className="truncate text-[12px] font-bold text-white drop-shadow">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-white/55">
                        {flagEmoji(item.country)} {item.country.toUpperCase()}
                      </p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/65 opacity-0 transition-opacity duration-300 group-hover/top:opacity-100">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          launch(item, medium, items);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && launch(item, medium, items)}
                        className="grid h-10 w-10 place-items-center rounded-full bg-white text-black transition hover:scale-110 hover:bg-brand-500 hover:text-white"
                      >
                        <Play className="h-4 w-4 translate-x-[1px]" />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(medium, item);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && toggleFavorite(medium, item)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-white/40 text-white transition hover:scale-110 hover:border-white"
                      >
                        {fav ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </span>
                      <span className="grid h-9 w-9 place-items-center rounded-full border border-white/40 text-white">
                        <Info className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
        <div className="w-4 shrink-0" />
      </div>
    </section>
  );
}
