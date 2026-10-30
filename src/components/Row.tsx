import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Item, Medium } from "@/types";
import { cn, formatCount } from "@/lib/utils";
import { categoryCached, curate, fetchCategory } from "@/lib/catalog";
import { navigate } from "@/lib/router";
import { ChannelCard } from "@/components/ChannelCard";
import { ChevronLeft, ChevronRight } from "@/components/Icons";

export function useInView<T extends HTMLElement>(rootMargin = "500px") {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, rootMargin]);
  return { ref, seen };
}

function CardSkeleton() {
  return (
    <div className="w-[185px] shrink-0 sm:w-[218px] lg:w-[246px]">
      <div className="skeleton aspect-video w-full rounded-2xl" />
      <div className="skeleton mt-2 h-3 w-3/4 rounded" />
      <div className="skeleton mt-1.5 h-2.5 w-1/2 rounded" />
    </div>
  );
}

interface RailProps {
  items: Item[];
  medium: Medium;
  category?: string;
  onInfo: (item: Item, medium: Medium, queue: Item[]) => void;
  loading?: boolean;
}

export function Rail({ items, medium, category, onInfo, loading }: RailProps) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ left: false, right: true });

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 8,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    sync();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync, items.length]);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <div className="group/rail relative">
      <button
        type="button"
        onClick={() => page(-1)}
        aria-label="Scroll left"
        className={cn(
          "absolute -left-2 top-[38%] z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/70 text-white backdrop-blur transition hover:scale-110 hover:bg-black md:grid",
          edges.left ? "opacity-0 group-hover/rail:opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => page(1)}
        aria-label="Scroll right"
        className={cn(
          "absolute -right-2 top-[38%] z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/70 text-white backdrop-blur transition hover:scale-110 hover:bg-black md:grid",
          edges.right ? "opacity-0 group-hover/rail:opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={scroller}
        onScroll={sync}
        className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto scroll-smooth px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10"
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
          : items.map((item) => (
              <ChannelCard
                key={item.nanoid}
                item={item}
                medium={medium}
                category={category}
                queue={items}
                onInfo={onInfo}
              />
            ))}
        <div className="w-2 shrink-0" />
      </div>
    </div>
  );
}

interface RowProps {
  title: string;
  subtitle?: string;
  icon?: string;
  medium: Medium;
  category?: string;
  items?: Item[];
  limit?: number;
  seed?: string;
  onInfo: (item: Item, medium: Medium, queue: Item[]) => void;
  moreHref?: string;
}

export function Row({
  title,
  subtitle,
  icon,
  medium,
  category,
  items: provided,
  limit = 24,
  seed = "v1",
  onInfo,
  moreHref,
}: RowProps) {
  const { ref, seen } = useInView<HTMLElement>();
  const [data, setData] = useState<Item[] | null>(
    provided ?? (category ? categoryCached(medium, category) : null),
  );
  const [total, setTotal] = useState<number>(provided?.length ?? 0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (provided) {
      setData(provided);
      setTotal(provided.length);
    }
  }, [provided]);

  useEffect(() => {
    if (!seen || provided || !category || data) return;
    let alive = true;
    fetchCategory(medium, category)
      .then((all) => {
        if (!alive) return;
        setTotal(all.length);
        setData(all);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [seen, provided, category, medium, data]);

  const shown = useMemo(() => {
    if (!data) return [];
    const base = category ? curate(data, seed + category) : data;
    return base.slice(0, limit);
  }, [data, category, seed, limit]);

  if (error) return null;

  return (
    <section ref={ref} className="cv-auto relative py-4">
      <div className="mb-3 flex items-end justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="min-w-0">
          <h2 className="font-display flex items-center gap-2 text-[17px] font-bold tracking-tight text-white sm:text-xl">
            {icon && <span className="text-base sm:text-lg">{icon}</span>}
            <span className="truncate">{title}</span>
            {total > 0 && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/50">
                {formatCount(total)}
              </span>
            )}
          </h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-white/40">{subtitle}</p>}
        </div>
        {moreHref && (
          <button
            type="button"
            onClick={() => navigate(moreHref)}
            className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-white/60 transition hover:border-brand-500 hover:text-white"
          >
            Explore all →
          </button>
        )}
      </div>
      <Rail items={shown} medium={medium} category={category} onInfo={onInfo} loading={!data} />
    </section>
  );
}
