import { useEffect, useMemo, useRef, useState } from "react";
import type { CountryMetaMap, Item, Medium } from "@/types";
import { fetchAll, fetchCountryMeta, isCached, paths } from "@/lib/catalog";

export function useDebounced<T>(value: T, delay = 180): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAllItems(medium: Medium, enabled = true): AsyncState<Item[]> {
  const [state, setState] = useState<AsyncState<Item[]>>(() => ({
    data: null,
    loading: enabled && !isCached(paths.category(medium, "all")),
    error: null,
  }));

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchAll(medium)
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((e: Error) => alive && setState({ data: null, loading: false, error: e.message }));
    return () => {
      alive = false;
    };
  }, [medium, enabled]);

  return state;
}

const metaCache: Partial<Record<Medium, CountryMetaMap>> = {};

export function useCountryMeta(medium: Medium): AsyncState<CountryMetaMap> {
  const [state, setState] = useState<AsyncState<CountryMetaMap>>(() => ({
    data: metaCache[medium] ?? null,
    loading: !metaCache[medium],
    error: null,
  }));

  useEffect(() => {
    let alive = true;
    if (metaCache[medium]) {
      setState({ data: metaCache[medium]!, loading: false, error: null });
      return;
    }
    fetchCountryMeta(medium)
      .then((data) => {
        metaCache[medium] = data;
        if (alive) setState({ data, loading: false, error: null });
      })
      .catch((e: Error) => alive && setState({ data: null, loading: false, error: e.message }));
    return () => {
      alive = false;
    };
  }, [medium]);

  return state;
}

export function useScrolled(threshold = 12): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const fn = () => setOn(window.scrollY > threshold);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [threshold]);
  return on;
}

/** Progressive reveal for long grids. */
export function usePagination<T>(items: T[], pageSize = 48) {
  const [count, setCount] = useState(pageSize);
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => setCount(pageSize), [items, pageSize]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setCount((c) => (c < items.length ? c + pageSize : c));
        }
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [items.length, pageSize]);

  const slice = useMemo(() => items.slice(0, count), [items, count]);
  return { slice, sentinel, hasMore: count < items.length, total: items.length };
}
