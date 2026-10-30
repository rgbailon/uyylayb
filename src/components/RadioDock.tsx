import { useEffect, useMemo, useRef, useState } from "react";
import { loadHls, type Hls } from "@/lib/hls";
import { useApp } from "@/store/app";
import { playSources } from "@/lib/catalog";
import { flagEmoji, languageName } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ChannelArt } from "@/components/ChannelArt";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Close,
  Pause,
  Play,
  Plus,
  Refresh,
  Volume,
  VolumeOff,
} from "@/components/Icons";

function Equalizer({ active }: { active: boolean }) {
  return (
    <div className="flex h-5 items-end gap-[3px]">
      {[0.15, 0.4, 0.05, 0.3, 0.22].map((d, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] origin-bottom rounded-full",
            active ? "bg-mint-400" : "bg-white/25",
          )}
          style={{
            height: "100%",
            animation: active ? `eq ${0.75 + i * 0.13}s ease-in-out ${d}s infinite` : undefined,
            transform: active ? undefined : "scaleY(0.3)",
          }}
        />
      ))}
    </div>
  );
}

export function RadioDock() {
  const { audio, stopAudio, stepAudio, isFavorite, toggleFavorite, settings } = useApp();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [srcIndex, setSrcIndex] = useState(0);
  const [state, setState] = useState<"loading" | "playing" | "paused" | "error">("loading");
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const adjustVolumeRelative = (delta: number) => {
    const next = Math.max(0, Math.min(1, Math.round((volume + delta) * 100) / 100));
    setVolume(next);
    setMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = next;
      audioRef.current.muted = false;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      if (dx < 0) stepAudio(1);
      else stepAudio(-1);
    }
  };

  const item = audio?.item ?? null;
  const sources = useMemo(() => (item ? playSources(item).filter((s) => s.kind !== "youtube") : []), [item]);
  const source = sources[srcIndex];

  useEffect(() => {
    setSrcIndex(0);
    setState("loading");
  }, [item?.nanoid]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !source) {
      if (item && !source) setState("error");
      return;
    }
    let disposed = false;
    setState("loading");

    const start = () => {
      el.volume = volume;
      el.muted = muted || settings.startMuted;
      el.play().catch(() => {
        el.muted = true;
        setMuted(true);
        el.play().catch(() => !disposed && setState("error"));
      });
    };

    const fail = () => {
      if (disposed) return;
      if (srcIndex + 1 < sources.length) setSrcIndex((i) => i + 1);
      else setState("error");
    };

    if (/m3u8/i.test(source.url)) {
      void loadHls().then((HlsCtor) => {
        if (disposed) return;
        if (!HlsCtor || !HlsCtor.isSupported()) {
          el.src = source.url; // native HLS (Safari) or a last attempt
          el.load();
          start();
          return;
        }
        const hls = new HlsCtor({ enableWorker: true, manifestLoadingMaxRetry: 1 });
        hlsRef.current = hls;
        hls.loadSource(source.url);
        hls.attachMedia(el);
        hls.on(HlsCtor.Events.MANIFEST_PARSED, start);
        hls.on(HlsCtor.Events.ERROR, (_e, d) => d.fatal && fail());
      });
    } else {
      el.src = source.url;
      el.load();
      start();
    }

    const timer = window.setTimeout(() => {
      if (!disposed && el.paused) fail();
    }, 14000);

    const onPlaying = () => !disposed && (window.clearTimeout(timer), setState("playing"));
    const onPause = () => !disposed && setState((s) => (s === "playing" ? "paused" : s));
    const onWaiting = () => !disposed && setState((s) => (s === "playing" ? "loading" : s));

    el.addEventListener("playing", onPlaying);
    el.addEventListener("pause", onPause);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("error", fail);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("error", fail);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      el.removeAttribute("src");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.url]);

  if (!audio || !item) return null;

  const fav = isFavorite("radio", item);
  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => undefined);
    else el.pause();
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="fixed inset-x-0 bottom-0 z-[65] animate-rise border-t border-white/10 bg-ink-950/92 backdrop-blur-2xl select-none"
    >
      <div className="h-[2px] w-full overflow-hidden bg-white/5">
        <div
          className={cn(
            "h-full brand-gradient transition-all duration-500",
            state === "loading" ? "w-2/3 animate-pulse" : state === "playing" ? "w-full" : "w-0",
          )}
        />
      </div>
      <audio ref={audioRef} crossOrigin={undefined} preload="none" />
      <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-6">
        <ChannelArt item={item} medium="radio" className="h-12 w-12 shrink-0 rounded-xl sm:h-14 sm:w-14" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Equalizer active={state === "playing"} />
            <p className="truncate text-sm font-semibold text-white">{item.name}</p>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-white/45">
            {flagEmoji(item.country)} {item.country.toUpperCase()}
            {item.languages.length > 0 && ` · ${item.languages.map(languageName).join(", ")}`}
            {state === "error" && <span className="text-brand-400"> · stream offline</span>}
            {sources.length > 1 && state !== "error" && ` · source ${srcIndex + 1}/${sources.length}`}
          </p>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => toggleFavorite("radio", item)}
            className={cn(
              "hidden h-9 w-9 place-items-center rounded-full transition sm:grid",
              fav ? "bg-brand-500 text-white" : "text-white/60 hover:bg-white/10 hover:text-white",
            )}
            aria-label="Toggle My List"
          >
            {fav ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
          {audio.queue.length > 1 && (
            <button
              type="button"
              onClick={() => stepAudio(-1)}
              title="Previous station (Left arrow / swipe right)"
              className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Previous station"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {state === "error" ? (
            <button
              type="button"
              onClick={() => {
                setSrcIndex(0);
                setState("loading");
              }}
              className="grid h-10 w-10 place-items-center rounded-full bg-white text-black transition hover:bg-brand-500 hover:text-white"
              aria-label="Retry"
            >
              <Refresh className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggle}
              className="grid h-10 w-10 place-items-center rounded-full bg-white text-black transition hover:scale-105 hover:bg-brand-500 hover:text-white"
              aria-label={state === "playing" ? "Pause" : "Play"}
            >
              {state === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
            </button>
          )}
          {audio.queue.length > 1 && (
            <button
              type="button"
              onClick={() => stepAudio(1)}
              title="Next station (Right arrow / swipe left)"
              className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Next station"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              onClick={() => {
                const next = !muted;
                setMuted(next);
                if (audioRef.current) audioRef.current.muted = next;
              }}
              className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeOff className="h-4 w-4" /> : <Volume className="h-4 w-4" />}
            </button>

            {/* Quick volume arrows */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => adjustVolumeRelative(-0.1)}
                title="Volume Down"
                className="grid h-7 w-7 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Volume Down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => adjustVolumeRelative(0.1)}
                title="Volume Up"
                className="grid h-7 w-7 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Volume Up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                setMuted(false);
                if (audioRef.current) {
                  audioRef.current.volume = v;
                  audioRef.current.muted = false;
                }
              }}
              className="w-20"
              aria-label="Volume"
            />
          </div>

          <button
            type="button"
            onClick={stopAudio}
            className="grid h-9 w-9 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Close radio player"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
