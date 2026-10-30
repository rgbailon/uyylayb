import { useApp, useToasts } from "@/store/app";
import { cn } from "@/lib/utils";
import { navigate } from "@/lib/router";
import { MEDIA } from "@/lib/constants";
import { Bolt } from "@/components/Icons";

export function Toasts() {
  const toasts = useToasts();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[90] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto w-full animate-rise rounded-xl border px-4 py-2.5 text-center text-[13px] font-medium shadow-xl backdrop-blur-xl",
            t.tone === "success"
              ? "border-mint-400/30 bg-mint-400/12 text-mint-400"
              : t.tone === "warn"
                ? "border-amber-400/30 bg-amber-400/12 text-amber-300"
                : "border-white/12 bg-ink-900/92 text-white/85",
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ["⌘ K  /  /", "Open universal search"],
  ["space  ·  k", "Play or pause the player"],
  ["Enter  ·  f", "Toggle fullscreen (in theater & fullscreen)"],
  ["←  →", "Previous / next channel (works in fullscreen)"],
  ["↑  ↓", "Volume up / down"],
  ["m", "Mute or unmute"],
  ["Swipe ← →", "Next / previous channel on mobile"],
  ["i", "Show live stream diagnostics"],
  ["esc", "Exit fullscreen / minimise player"],
  ["tab", "Switch medium inside search"],
  ["?", "Show this panel"],
];

export function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[85] grid animate-fade place-items-center bg-black/80 p-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg animate-pop rounded-3xl border border-white/10 bg-ink-900/97 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-black tracking-tight text-white">
          Keyboard shortcuts
        </h2>
        <p className="mt-1 text-xs text-white/40">Built for people who never touch the mouse.</p>
        <dl className="mt-5 space-y-2">
          {SHORTCUTS.map(([keys, desc]) => (
            <div key={keys} className="flex items-center justify-between gap-4">
              <dt className="shrink-0 rounded-lg border border-white/12 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/80">
                {keys}
              </dt>
              <dd className="min-w-0 flex-1 border-b border-dotted border-white/10" />
              <dd className="shrink-0 text-right text-[12px] text-white/55">{desc}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-white py-2.5 text-xs font-bold text-black transition hover:bg-brand-500 hover:text-white"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export function Footer() {
  const { audio } = useApp();
  return (
    <footer className={cn("mt-20 border-t border-white/8 bg-ink-950", audio && "pb-24")}>
      <div className="mx-auto max-w-[1800px] px-4 py-12 sm:px-6 lg:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] brand-gradient">
                <Bolt className="h-4 w-4 text-white" />
              </span>
              <div className="flex flex-col">
                <span className="font-display text-base font-black uppercase tracking-[0.18em] leading-tight text-white">
                  uyy<span className="text-layb">layb</span>
                </span>
                <span className="text-[9px] font-medium tracking-wider text-white/40 uppercase -mt-0.5">
                  powered by famelack
                </span>
              </div>
            </div>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-white/40">
              An open streaming front-end built on the public{" "}
              <a
                href="https://github.com/famelack/famelack-data"
                target="_blank"
                rel="noreferrer"
                className="text-white/70 underline decoration-white/20 underline-offset-2 hover:text-brand-400"
              >
                famelack-data
              </a>{" "}
              dataset — curated live TV, radio and webcam feeds from around the world, continuously
              validated and refreshed.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Browse</h4>
            <ul className="space-y-2 text-[13px]">
              {MEDIA.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/${m.id}`)}
                    className="text-white/55 transition hover:text-white"
                  >
                    {m.label}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => navigate("/countries")}
                  className="text-white/55 transition hover:text-white"
                >
                  Countries
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
              Shortcuts
            </h4>
            <ul className="space-y-2 font-mono text-[12px] text-white/45">
              <li><kbd className="text-white/70">⌘K</kbd> / <kbd className="text-white/70">/</kbd> search</li>
              <li><kbd className="text-white/70">space</kbd> play · pause</li>
              <li><kbd className="text-white/70">f</kbd> fullscreen · <kbd className="text-white/70">m</kbd> mute</li>
              <li><kbd className="text-white/70">n</kbd> / <kbd className="text-white/70">p</kbd> next · prev</li>
              <li><kbd className="text-white/70">i</kbd> stream diagnostics</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Notice</h4>
            <p className="text-[12px] leading-relaxed text-white/40">
              All streams are hosted by third parties. Availability, geo-restrictions and rights are
              controlled by the broadcasters. Nothing is proxied, cached or re-hosted here.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/8 pt-6 text-[11px] text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <p>Data sourced from Famelack (famelack.com) · MIT licence.</p>
          <p>Built as an independent client. Not affiliated with any broadcaster.</p>
        </div>
      </div>
    </footer>
  );
}
