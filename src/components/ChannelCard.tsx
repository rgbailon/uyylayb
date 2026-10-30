import { memo, useCallback } from "react";
import type { Item, Medium } from "@/types";
import { cn } from "@/lib/utils";
import { flagEmoji, languageName } from "@/lib/constants";
import { primaryKind, sourceCount } from "@/lib/catalog";
import { useApp } from "@/store/app";
import { ChannelArt } from "@/components/ChannelArt";
import { Check, Info, Lock, Play, Plus } from "@/components/Icons";

export function useLaunch() {
  const { playVideo, playAudio } = useApp();
  return useCallback(
    (item: Item, medium: Medium, queue: Item[] = []) => {
      if (medium === "radio") playAudio(item, queue);
      else playVideo(item, medium, queue);
    },
    [playVideo, playAudio],
  );
}

export function SourceBadge({ item }: { item: Item }) {
  const kind = primaryKind(item);
  const label = kind === "youtube" ? "YT" : kind === "hls" ? "HLS" : "DIR";
  const n = sourceCount(item);
  return (
    <span className="rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-white/80">
      {label}
      {n > 1 && <span className="text-white/45">×{n}</span>}
    </span>
  );
}

interface Props {
  item: Item;
  medium: Medium;
  category?: string;
  queue?: Item[];
  onInfo?: (item: Item, medium: Medium, queue: Item[]) => void;
  className?: string;
  variant?: "row" | "grid";
}

function CardInner({ item, medium, category, queue = [], onInfo, className, variant = "row" }: Props) {
  const launch = useLaunch();
  const { isFavorite, toggleFavorite } = useApp();
  const fav = isFavorite(medium, item);

  const open = () => onInfo?.(item, medium, queue);

  return (
    <div
      className={cn(
        "group/card relative shrink-0 cursor-pointer outline-none",
        variant === "row" ? "w-[185px] sm:w-[218px] lg:w-[246px]" : "w-full",
        className,
      )}
      tabIndex={0}
      role="button"
      aria-label={item.name}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter") open();
        if (e.key === " ") {
          e.preventDefault();
          launch(item, medium, queue);
        }
      }}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/8 bg-ink-900 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.9)]",
          "transition-all duration-300 ease-out",
          "group-hover/card:-translate-y-1.5 group-hover/card:border-white/20 group-hover/card:shadow-[0_26px_60px_-18px_rgba(255,46,99,0.45)]",
          "group-focus-visible/card:ring-2 group-focus-visible/card:ring-brand-500",
        )}
      >
        <ChannelArt item={item} medium={medium} category={category} className="aspect-video w-full" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          <span className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/85">
            <span className="text-xs leading-none">{flagEmoji(item.country)}</span>
            {item.country.toUpperCase()}
          </span>
          <div className="flex items-center gap-1">
            {item.isGeoBlocked && (
              <span
                title="May be geo-restricted"
                className="grid h-[18px] w-[18px] place-items-center rounded-md bg-amber-500/80 text-black"
              >
                <Lock className="h-3 w-3" strokeWidth={2.4} />
              </span>
            )}
            <SourceBadge item={item} />
          </div>
        </div>

        <div className="absolute inset-0 flex flex-col justify-end gap-2 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                launch(item, medium, queue);
              }}
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-black transition hover:scale-110 hover:bg-brand-500 hover:text-white"
              aria-label={`Play ${item.name}`}
            >
              <Play className="h-4 w-4 translate-x-[1px]" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(medium, item);
              }}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full border border-white/35 transition hover:scale-110 hover:border-white",
                fav ? "bg-brand-500 text-white" : "bg-black/40 text-white",
              )}
              aria-label={fav ? "Remove from My List" : "Add to My List"}
            >
              {fav ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              className="ml-auto grid h-9 w-9 place-items-center rounded-full border border-white/35 bg-black/40 text-white transition hover:scale-110 hover:border-white"
              aria-label="More info"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 px-0.5">
        <p className="truncate text-[13px] font-semibold text-white/90 transition-colors group-hover/card:text-white">
          {item.name}
        </p>
        <p className="truncate text-[11px] text-white/40">
          {item.languages.length ? item.languages.slice(0, 2).map(languageName).join(" · ") : "Unlabelled"}
        </p>
      </div>
    </div>
  );
}

export const ChannelCard = memo(CardInner);
