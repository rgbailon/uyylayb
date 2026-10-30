import { useEffect, useMemo, useRef, useState } from "react";
import type { Medium } from "@/types";
import { MEDIA, flagEmoji, languageName } from "@/lib/constants";
import { useAllItems, useCountryMeta, useDebounced } from "@/lib/hooks";
import { buildIndex, searchIndex } from "@/lib/search";
import { cn, formatCount } from "@/lib/utils";
import { navigate } from "@/lib/router";
import { useApp } from "@/store/app";
import { useLaunch } from "@/components/ChannelCard";
import { ChannelArt } from "@/components/ChannelArt";
import { Close, Lock, Search as SearchIcon } from "@/components/Icons";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SearchPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [medium, setMedium] = useState<Medium>("tv");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const launch = useLaunch();
  const { history } = useApp();

  const debounced = useDebounced(query, 160);
  const { data: items, loading } = useAllItems(medium, open);
  const { data: meta } = useCountryMeta(medium);

  const countryNames = useMemo(() => {
    const out: Record<string, string> = {};
    if (meta) Object.entries(meta).forEach(([cc, m]) => (out[cc] = m.country));
    return out;
  }, [meta]);

  const hits = useMemo(() => {
    if (!items || !debounced.trim()) return [];
    return searchIndex(buildIndex(medium, items, countryNames), debounced, 80);
  }, [items, debounced, medium, countryNames]);

  useEffect(() => setActive(0), [hits]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(hits.length - 1, a + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const idx = MEDIA.findIndex((m) => m.id === medium);
        setMedium(MEDIA[(idx + (e.shiftKey ? -1 : 1) + MEDIA.length) % MEDIA.length].id);
      }
      if (e.key === "Enter" && hits[active]) {
        launch(hits[active].item, medium, hits.map((h) => h.item));
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hits, active, medium, launch, onClose]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const recents = history.slice(0, 6);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] animate-fade bg-black/75 p-0 backdrop-blur-md sm:p-6 sm:pt-[8vh]"
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full max-h-full w-full max-w-3xl animate-pop flex-col overflow-hidden rounded-none border border-white/10 bg-ink-900/95 shadow-2xl sm:h-auto sm:max-h-[78vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3.5">
          <SearchIcon className="h-5 w-5 shrink-0 text-white/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${items ? formatCount(items.length) : "thousands of"} ${
              medium === "tv" ? "channels" : medium === "radio" ? "stations" : "cams"
            }, countries, languages…`}
            className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
          />
          <kbd className="hidden rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white/40 sm:block">
            esc
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white sm:hidden"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 border-b border-white/8 px-4 py-2">
          {MEDIA.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMedium(m.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                medium === m.id
                  ? "bg-white text-black"
                  : "text-white/55 hover:bg-white/8 hover:text-white",
              )}
            >
              <span className="mr-1">{m.icon}</span>
              {m.label}
            </button>
          ))}
          <span className="ml-auto hidden font-mono text-[10px] text-white/30 sm:block">
            tab to switch · ↑↓ navigate · ↵ play
          </span>
        </div>

        <div ref={listRef} className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
          {loading && (
            <div className="space-y-2 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
              <p className="pt-1 text-center text-[11px] text-white/35">
                Loading the {medium} catalogue…
              </p>
            </div>
          )}

          {!loading && !query && (
            <div className="p-3">
              {recents.length > 0 && (
                <>
                  <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
                    Jump back in
                  </p>
                  <div className="mb-4 space-y-1">
                    {recents.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => {
                          launch(r.item, r.medium, []);
                          onClose();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/6"
                      >
                        <ChannelArt item={r.item} medium={r.medium} className="h-10 w-16 shrink-0 rounded-lg" />
                        <span className="truncate text-sm text-white/85">{r.item.name}</span>
                        <span className="ml-auto text-[10px] uppercase text-white/30">{r.medium}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
                Try searching
              </p>
              <div className="flex flex-wrap gap-1.5 px-1">
                {["BBC", "Al Jazeera", "France", "jazz", "Spanish", "NASA", "news", "Tokyo"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery(s)}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:border-brand-500 hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && query && hits.length === 0 && (
            <p className="p-8 text-center text-sm text-white/40">
              Nothing matched “{query}” in {medium}. Try another tab with <kbd className="font-mono">tab</kbd>.
            </p>
          )}

          {hits.map((h, i) => (
            <button
              key={h.item.nanoid}
              data-idx={i}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                launch(h.item, medium, hits.map((x) => x.item));
                onClose();
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl p-2 text-left transition",
                i === active ? "bg-white/10" : "hover:bg-white/6",
              )}
            >
              <ChannelArt item={h.item} medium={medium} className="h-11 w-[72px] shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white/90">{h.item.name}</p>
                <p className="flex items-center gap-1.5 truncate text-[11px] text-white/40">
                  <span>{flagEmoji(h.item.country)}</span>
                  {countryNames[h.item.country.toUpperCase()] ?? h.item.country.toUpperCase()}
                  {h.item.languages.length > 0 && ` · ${h.item.languages.slice(0, 2).map(languageName).join(", ")}`}
                  {h.item.isGeoBlocked && <Lock className="h-3 w-3 text-amber-400" />}
                </p>
              </div>
              {i === active && (
                <span className="shrink-0 rounded-full bg-brand-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Play
                </span>
              )}
            </button>
          ))}

          {hits.length > 0 && (
            <button
              type="button"
              onClick={() => {
                navigate(`/browse/${medium}?q=${encodeURIComponent(query)}`);
                onClose();
              }}
              className="mt-2 w-full rounded-xl border border-white/8 py-2.5 text-xs font-semibold text-white/55 transition hover:border-brand-500 hover:text-white"
            >
              Open all results in browser view →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
