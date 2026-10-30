import { useEffect, useRef, useState } from "react";
import type { Medium } from "@/types";
import { HOME_ROWS, MEDIA } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { navigate, useRoute } from "@/lib/router";
import { useScrolled } from "@/lib/hooks";
import { useApp, type Settings } from "@/store/app";
import { fetchCategory } from "@/lib/catalog";
import { useLaunch } from "@/components/ChannelCard";
import { Globe, Heart, Search, Settings as SettingsIcon, Shuffle, Tv } from "@/components/Icons";

const NAV = [
  { to: "/", label: "Home", match: (p: string) => p === "/" },
  { to: "/tv", label: "Live TV", match: (p: string) => p.startsWith("/tv") || p.startsWith("/browse/tv") },
  { to: "/radio", label: "Radio", match: (p: string) => p.startsWith("/radio") || p.startsWith("/browse/radio") },
  { to: "/webcams", label: "Webcams", match: (p: string) => p.startsWith("/webcams") || p.startsWith("/browse/webcams") },
  { to: "/countries", label: "Countries", match: (p: string) => p.startsWith("/countr") },
];

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition hover:bg-white/6"
    >
      <span
        className={cn(
          "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition",
          value ? "bg-brand-500" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "h-4 w-4 rounded-full bg-white transition-transform",
            value && "translate-x-4",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-white/90">{label}</span>
        <span className="block text-[11px] leading-snug text-white/40">{hint}</span>
      </span>
    </button>
  );
}

export function Header({ onSearch }: { onSearch: () => void }) {
  const route = useRoute();
  const scrolled = useScrolled(10);
  const { favorites, settings, updateSetting, pushToast } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const launch = useLaunch();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => setMobileOpen(false), [route.path]);

  const surprise = async () => {
    const medium: Medium = route.path.startsWith("/radio")
      ? "radio"
      : route.path.startsWith("/webcams")
        ? "webcams"
        : "tv";
    setShuffling(true);
    try {
      const pool = HOME_ROWS[medium];
      const category = pool[Math.floor(Math.random() * pool.length)];
      const all = await fetchCategory(medium, category);
      const usable = all.filter((i) => !i.isGeoBlocked);
      const list = usable.length ? usable : all;
      const picks = [...list].sort(() => Math.random() - 0.5).slice(0, 30);
      if (!picks.length) throw new Error("empty");
      launch(picks[0], medium, picks);
      pushToast(`Tuned into ${picks[0].name}`, "success");
    } catch {
      pushToast("Could not reach the catalogue", "warn");
    } finally {
      setShuffling(false);
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "glass border-b border-white/8" : "bg-gradient-to-b from-black/85 to-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="group flex shrink-0 items-center gap-2.5 text-left"
          aria-label="uyylayb home"
        >
          <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[10px] brand-gradient shadow-lg shadow-brand-500/30">
            <Tv className="h-4 w-4 text-white" strokeWidth={2.2} />
          </span>
          <div className="flex flex-col">
            <span className="font-display text-[17px] font-black uppercase tracking-[0.18em] leading-tight text-white">
              uyy<span className="text-layb">layb</span>
            </span>
            <span className="text-[9px] font-medium tracking-wider text-white/40 uppercase -mt-0.5">
              powered by famelack
            </span>
          </div>
        </button>

        <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => {
            const active = n.match(route.path);
            return (
              <button
                key={n.to}
                type="button"
                onClick={() => navigate(n.to)}
                className={cn(
                  "relative rounded-full px-3.5 py-2 text-[13px] font-medium transition",
                  active ? "text-white" : "text-white/55 hover:text-white",
                )}
              >
                {n.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full brand-gradient" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSearch}
            className="flex items-center gap-2 rounded-full border border-white/12 bg-white/5 py-2 pl-3 pr-2 text-left text-xs text-white/45 transition hover:border-white/30 hover:text-white sm:w-56"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden flex-1 truncate sm:block">Search everything…</span>
            <kbd className="hidden rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] sm:block">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={surprise}
            disabled={shuffling}
            title="Surprise me"
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-brand-500 hover:text-white",
              shuffling && "animate-spin",
            )}
          >
            <Shuffle className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/list")}
            title="My List"
            className={cn(
              "relative hidden h-9 w-9 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-brand-500 hover:text-white sm:grid",
              route.path.startsWith("/list") && "border-brand-500 text-white",
            )}
          >
            <Heart className="h-4 w-4" />
            {favorites.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">
                {favorites.length > 99 ? "99+" : favorites.length}
              </span>
            )}
          </button>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-brand-500 hover:text-white"
              aria-label="Settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 w-72 animate-pop rounded-2xl border border-white/10 bg-ink-900/97 p-2 shadow-2xl backdrop-blur-xl">
                <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                  Playback preferences
                </p>
                {(
                  [
                    ["artwork", "Channel artwork", "Enrich cards with open logo data (loads in background)"],
                    ["autoAdvance", "Auto source failover", "Silently jump to the next feed when one dies"],
                    ["startMuted", "Start muted", "Begin every stream without sound"],
                    ["hideGeoBlocked", "Hide geo-restricted", "Filter out streams likely blocked in your region"],
                  ] as [keyof Settings, string, string][]
                ).map(([key, label, hint]) => (
                  <Toggle
                    key={key}
                    label={label}
                    hint={hint}
                    value={settings[key]}
                    onChange={(v) => updateSetting(key, v)}
                  />
                ))}
                <div className="mt-1 border-t border-white/8 px-2.5 py-2 text-[10px] leading-relaxed text-white/30">
                  Data: <span className="text-white/50">famelack/famelack-data</span> · MIT. Streams are
                  third-party and may fail or be region-locked.
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-white/70 lg:hidden"
            aria-label="Menu"
          >
            <Globe className="h-4 w-4" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="animate-fade border-t border-white/8 bg-ink-950/97 px-4 py-3 lg:hidden">
          <div className="grid grid-cols-2 gap-1.5">
            {[...NAV, { to: "/list", label: "My List", match: () => false }].map((n) => (
              <button
                key={n.to}
                type="button"
                onClick={() => navigate(n.to)}
                className="rounded-xl border border-white/8 px-3 py-2.5 text-left text-sm font-medium text-white/75 transition hover:border-brand-500 hover:text-white"
              >
                {n.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            {MEDIA.map((m) => (
              <span key={m.id} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/45">
                {m.icon} {m.short}
              </span>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
