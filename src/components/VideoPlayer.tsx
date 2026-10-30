import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadHls, type Hls } from "@/lib/hls";
import type { Item, Medium } from "@/types";
import { playSources, youtubeId } from "@/lib/catalog";
import { cn, fmtBitrate } from "@/lib/utils";
import { flagEmoji, languageName } from "@/lib/constants";
import { useApp } from "@/store/app";
import {
  Bolt,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Close,
  Collapse,
  Expand,
  Lock,
  Pause,
  Pip,
  Play,
  Plus,
  Refresh,
  Skip,
  Volume,
  VolumeOff,
  ScanEye,
  Settings,
} from "@/components/Icons";
import { VisionPanel } from "@/components/VisionPanel";
import { useSwipe } from "@/lib/useSwipe";

type Status = "idle" | "loading" | "playing" | "paused" | "error";

interface Props {
  item: Item;
  medium: Medium;
  queue: Item[];
  mode: "theater" | "mini";
  onClose: () => void;
  onToggleMode: () => void;
  onSelect: (item: Item) => void;
}

const YT_ORIGIN = "https://www.youtube-nocookie.com";

export function VideoPlayer({ item, medium, queue, mode, onClose, onToggleMode, onSelect }: Props) {
  const { settings, isFavorite, toggleFavorite, pushToast } = useApp();
  const sources = useMemo(() => playSources(item), [item]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const watchdog = useRef<number | null>(null);

  const [srcIndex, setSrcIndex] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [muted, setMuted] = useState(settings.startMuted);
  const [volume, setVolume] = useState(1);
  const [levels, setLevels] = useState<{ height: number; bitrate: number }[]>([]);
  const [level, setLevel] = useState(-1);
  const [stats, setStats] = useState({ bw: 0, buffer: 0, dropped: 0, res: "" });
  const [showStats, setShowStats] = useState(false);
  const [showVision, setShowVision] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [ytQuality, setYtQuality] = useState("default");
  const [captions, setCaptions] = useState(false);
  /** Seconds behind the live edge (0 = watching live). */
  const [behind, setBehind] = useState(0);
  const driftRef = useRef(0);
  const ytTimeRef = useRef<{ current: number; duration: number }>({ current: 0, duration: 0 });
  /** Panel hidden but still mounted, so detection keeps running with a clear view. */
  const [visionHidden, setVisionHidden] = useState(false);
  const [visionStatus, setVisionStatus] = useState<{ scanning: boolean; names: string[] }>({
    scanning: false,
    names: [],
  });
  const [uiVisible, setUiVisible] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const [attempted, setAttempted] = useState<number[]>([]);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const clickTimer = useRef<number | null>(null);
  const [hudNotice, setHudNotice] = useState<{ icon: string; text: string; sub?: string } | null>(null);
  const hudTimerRef = useRef<number | null>(null);

  const triggerHud = useCallback((icon: string, text: string, sub?: string) => {
    if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
    setHudNotice({ icon, text, sub });
    hudTimerRef.current = window.setTimeout(() => setHudNotice(null), 1400);
  }, []);

  const source = sources[srcIndex];
  const isYouTube = source?.kind === "youtube";
  const fav = isFavorite(medium, item);

  useEffect(() => {
    setSrcIndex(0);
    setAttempted([]);
    setStatus("loading");
    setErrorMsg("");
  }, [item.nanoid]);

  const clearWatchdog = () => {
    if (watchdog.current) {
      window.clearTimeout(watchdog.current);
      watchdog.current = null;
    }
  };

  const nextSource = useCallback(
    (reason: string) => {
      clearWatchdog();
      setAttempted((a) => (a.includes(srcIndex) ? a : [...a, srcIndex]));
      if (settings.autoAdvance && srcIndex + 1 < sources.length) {
        setStatus("loading");
        setErrorMsg("");
        setSrcIndex((i) => i + 1);
      } else {
        setStatus("error");
        setErrorMsg(reason);
      }
    },
    [srcIndex, sources.length, settings.autoAdvance],
  );

  /* ---------------------------------------------------------------- engine */
  useEffect(() => {
    if (!source || isYouTube) return;
    const video = videoRef.current;
    if (!video) return;

    let disposed = false;
    setStatus("loading");
    setLevels([]);
    setLevel(-1);

    clearWatchdog();
    watchdog.current = window.setTimeout(() => {
      if (!disposed) nextSource("This source timed out. It may be offline or blocked by CORS.");
    }, 15000);

    const startPlay = () => {
      video.muted = muted;
      video.volume = volume;
      video.play().catch(() => {
        video.muted = true;
        setMuted(true);
        video.play().catch(() => undefined);
      });
    };

    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl");
    const playNative = () => {
      video.src = source.url;
      video.addEventListener("loadedmetadata", startPlay, { once: true });
    };

    if (source.kind === "hls") {
      // iOS Safari plays HLS natively — no need to download hls.js at all.
      const hasMse = typeof window.MediaSource !== "undefined" || "ManagedMediaSource" in window;
      if (nativeHls && !hasMse) {
        playNative();
      } else {
        void loadHls().then((HlsCtor) => {
          if (disposed) return;
          if (!HlsCtor || !HlsCtor.isSupported()) {
            if (nativeHls) playNative();
            else nextSource("The streaming engine could not be loaded. Check your connection.");
            return;
          }
          const hls = new HlsCtor({
            enableWorker: true,
            lowLatencyMode: false,
            capLevelToPlayerSize: false,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            manifestLoadingTimeOut: 12000,
            manifestLoadingMaxRetry: 1,
            levelLoadingMaxRetry: 2,
            fragLoadingMaxRetry: 3,
          });
          hlsRef.current = hls;
          hls.loadSource(source.url);
          hls.attachMedia(video);
          hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
            if (disposed) return;
            setLevels(hls.levels.map((l) => ({ height: l.height || 0, bitrate: l.bitrate })));
            startPlay();
          });
          hls.on(HlsCtor.Events.LEVEL_SWITCHED, (_e, data) => setLevel(data.level));
          hls.on(HlsCtor.Events.ERROR, (_e, data) => {
            if (!data.fatal || disposed) return;
            if (data.type === HlsCtor.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
              return;
            }
            nextSource(
              data.type === HlsCtor.ErrorTypes.NETWORK_ERROR
                ? "Stream unreachable (network or CORS restriction)."
                : "Playback failed on this source.",
            );
          });
        });
      }
    } else {
      playNative();
    }

    const onPlaying = () => {
      if (disposed) return;
      clearWatchdog();
      setStatus("playing");
    };
    const onPause = () => !disposed && setStatus((s) => (s === "playing" ? "paused" : s));
    const onWaiting = () => !disposed && setStatus((s) => (s === "playing" ? "loading" : s));
    const onError = () => !disposed && nextSource("The browser could not decode this source.");

    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("error", onError);

    return () => {
      disposed = true;
      clearWatchdog();
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("error", onError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeAttribute("src");
      video.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.url, isYouTube]);

  /* ----------------------------------------------------------- yt bridge */
  const ytCommand = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*",
    );
  }, []);

  /* ------------------------------- custom settings → YouTube bridge ---------------- */
  const ytState = useRef({ speed, ytQuality, captions });
  ytState.current = { speed, ytQuality, captions };

  const pushYtSettings = useCallback(() => {
    if (!iframeRef.current) return;
    ytCommand("setPlaybackRate", [ytState.current.speed]);
    ytCommand("setPlaybackQuality", [ytState.current.ytQuality]);
    ytCommand(ytState.current.captions ? "loadModule" : "unloadModule", ["captions"]);
    if (ytState.current.captions) ytCommand("setOption", ["captions", "track", { languageCode: "en" }]);
  }, [ytCommand]);

  useEffect(() => {
    if (isYouTube) pushYtSettings();
  }, [speed, ytQuality, captions, isYouTube, pushYtSettings]);

  // HTML5 playback speed (HLS / direct sources).
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
  }, [speed, source?.url]);

  useEffect(() => {
    if (!isYouTube) return;
    setStatus("loading");
    const onMessage = (e: MessageEvent) => {
      if (typeof e.data !== "string" || !e.origin.includes("youtube")) return;
      try {
        const msg = JSON.parse(e.data) as {
          event?: string;
          info?: { playerState?: number; currentTime?: number; duration?: number };
        };
        if (typeof msg.info?.currentTime === "number") ytTimeRef.current.current = msg.info.currentTime;
        if (typeof msg.info?.duration === "number") ytTimeRef.current.duration = msg.info.duration;
        if (msg.event === "onReady" || msg.event === "initialDelivery") {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "listening", id: 1 }),
            "*",
          );
          pushYtSettings();
          setStatus("playing");
        }
        const st = msg.info?.playerState;
        if (typeof st === "number") {
          if (st === 1) setStatus("playing");
          else if (st === 2) setStatus("paused");
          else if (st === 3) setStatus("loading");
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("message", onMessage);
    const t = window.setTimeout(() => setStatus((s) => (s === "loading" ? "playing" : s)), 2500);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(t);
    };
  }, [isYouTube, source?.url, pushYtSettings]);

  /* -------------------------------------------------------------- stats */
  useEffect(() => {
    if (isYouTube) return;
    const id = window.setInterval(() => {
      const v = videoRef.current;
      const hls = hlsRef.current;
      if (!v) return;
      let buffer = 0;
      try {
        if (v.buffered.length) buffer = v.buffered.end(v.buffered.length - 1) - v.currentTime;
      } catch {
        /* noop */
      }
      const q = v.getVideoPlaybackQuality?.();
      setStats({
        bw: hls?.bandwidthEstimate ?? 0,
        buffer,
        dropped: q?.droppedVideoFrames ?? 0,
        res: v.videoWidth ? `${v.videoWidth}×${v.videoHeight}` : "",
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isYouTube]);

  const LIVE_TOLERANCE = 6;

  /* ------------------------------------------------------------ controls */

  const goLive = useCallback(() => {
    driftRef.current = 0;
    setBehind(0);
    if (speed !== 1) setSpeed(1);
    if (isYouTube) {
      const { duration } = ytTimeRef.current;
      ytCommand("seekTo", [duration > 0 ? duration : 1e9, true]);
      ytCommand("playVideo");
      setStatus("playing");
    } else {
      const v = videoRef.current;
      if (v) {
        const sync = hlsRef.current?.liveSyncPosition;
        if (typeof sync === "number" && Number.isFinite(sync)) v.currentTime = sync;
        else if (v.seekable.length) v.currentTime = Math.max(0, v.seekable.end(v.seekable.length - 1) - 3);
        void v.play().catch(() => undefined);
      }
    }
    triggerHud("🔴", "Back to live");
  }, [isYouTube, speed, ytCommand, triggerHud]);

  const togglePlay = useCallback(() => {
    if (isYouTube) {
      if (status !== "playing" && behind > LIVE_TOLERANCE) {
        goLive();
        return;
      }
      ytCommand(status === "playing" ? "pauseVideo" : "playVideo");
      setStatus((s) => (s === "playing" ? "paused" : "playing"));
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (behind > LIVE_TOLERANCE) goLive();
      else v.play().catch(() => undefined);
    } else v.pause();
  }, [isYouTube, status, ytCommand, behind, goLive]);

  const applyMute = useCallback(
    (next: boolean) => {
      setMuted(next);
      if (isYouTube) ytCommand(next ? "mute" : "unMute");
      else if (videoRef.current) videoRef.current.muted = next;
    },
    [isYouTube, ytCommand],
  );

  const applyVolume = useCallback(
    (v: number) => {
      setVolume(v);
      if (isYouTube) {
        ytCommand("setVolume", [Math.round(v * 100)]);
        if (v > 0 && muted) applyMute(false);
      } else if (videoRef.current) {
        videoRef.current.volume = v;
        if (v > 0 && muted) applyMute(false);
      }
    },
    [isYouTube, ytCommand, muted, applyMute],
  );

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
      triggerHud("⤢", "Windowed mode");
    } else {
      el.requestFullscreen?.().then(
        () => triggerHud("⛶", "Fullscreen mode", "← / → channel · ↑ / ↓ volume · Enter toggle"),
        () => undefined,
      );
    }
  }, [triggerHud]);

  useEffect(() => {
    const fn = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  const requestPip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return pushToast("Picture-in-picture is unavailable for YouTube sources", "warn");
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      pushToast("Picture-in-picture was blocked by the browser", "warn");
    }
  }, [pushToast]);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (queue.length < 2) return;
      const idx = queue.findIndex((q) => q.nanoid === item.nanoid);
      const next = queue[(idx + dir + queue.length) % queue.length];
      onSelect(next);
      triggerHud(dir > 0 ? "→" : "←", next.name, dir > 0 ? "Next channel" : "Previous channel");
    },
    [queue, item.nanoid, onSelect, triggerHud],
  );

  const adjustVolumeRelative = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.min(1, Math.round((volume + delta) * 100) / 100));
      applyVolume(next);
      triggerHud(
        next === 0 ? "🔇" : next > 0.5 ? "🔊" : "🔉",
        `Volume ${Math.round(next * 100)}%`,
      );
    },
    [volume, applyVolume, triggerHud],
  );

  /* ------------------------------------------------------------ keyboard */
  useEffect(() => {
    if (mode !== "theater" && !document.fullscreenElement) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) ||
          // e.target is only an Element when the document has focus; keep this safe either way.
          (typeof t.closest === "function" && t.closest("[data-vision-panel]")))
      ) return;
      // Settings popover owns the keyboard until it is dismissed.
      if (settingsOpen && e.key !== "Escape") return;
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
          applyMute(!muted);
          triggerHud(!muted ? "🔇" : "🔊", !muted ? "Muted" : "Unmuted");
          break;
        case "enter":
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "i":
          setShowStats((s) => !s);
          break;
        case "arrowleft":
        case "p":
          e.preventDefault();
          step(-1);
          break;
        case "arrowright":
        case "n":
          e.preventDefault();
          step(1);
          break;
        case "arrowup":
          e.preventDefault();
          adjustVolumeRelative(0.08);
          break;
        case "arrowdown":
          e.preventDefault();
          adjustVolumeRelative(-0.08);
          break;
        case "escape":
          if (settingsOpen) setSettingsOpen(false);
          else if (!document.fullscreenElement && mode === "theater") onToggleMode();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    mode,
    togglePlay,
    applyMute,
    muted,
    toggleFullscreen,
    step,
    adjustVolumeRelative,
    triggerHud,
    onToggleMode,
    settingsOpen,
  ]);

  /* ---------------------------------------------------------- ui autohide
   * After 2 s without input the controls fade out and the cursor disappears.
   * Hovering a control (or the AI panel), an open settings menu, or a paused /
   * loading video keeps everything visible. */
  const IDLE_MS = 2000;
  const settingsOpenRef = useRef(settingsOpen);
  settingsOpenRef.current = settingsOpen;
  const uiVisibleRef = useRef(uiVisible);
  uiVisibleRef.current = uiVisible;
  /** On touch, the first tap while hidden only reveals controls (no play/pause). */
  const tapRevealUntil = useRef(0);

  useEffect(() => {
    if (mode !== "theater") {
      setUiVisible(true);
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    let timer = 0;
    let hoveringControl = false;
    let lastX = -1;
    let lastY = -1;

    const isControl = (target: EventTarget | null) =>
      target instanceof Element &&
      !!target.closest("button, a, input, select, textarea, [data-vision-panel], [data-keep-ui]");

    const schedule = (ms = IDLE_MS) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (settingsOpenRef.current || hoveringControl) schedule();
        else setUiVisible(false);
      }, ms);
    };

    const wake = () => {
      setUiVisible(true);
      schedule();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      // Ignore "fake" moves browsers emit when the DOM changes under a still cursor.
      if (Math.abs(e.clientX - lastX) < 2 && Math.abs(e.clientY - lastY) < 2) return;
      lastX = e.clientX;
      lastY = e.clientY;
      hoveringControl = isControl(e.target);
      wake();
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        hoveringControl = isControl(e.target);
      } else {
        hoveringControl = false;
        if (!uiVisibleRef.current) tapRevealUntil.current = performance.now() + 450;
      }
      wake();
    };

    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      hoveringControl = false;
      schedule(500);
    };

    const onKey = () => wake();

    schedule();
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKey);
    };
  }, [mode]);

  /* ---------------------------------------------------------- live edge
   * Two signals, take the larger:
   *  - measured: distance from the stream's live position (hls.js liveSyncPosition,
   *    the seekable range end, or YouTube's currentTime vs duration);
   *  - drift: wall-clock time lost while paused/buffering or playing slower than 1×.
   * The drift fallback matters because some streams don't expose a usable range. */

  useEffect(() => {
    driftRef.current = 0;
    ytTimeRef.current = { current: 0, duration: 0 };
    setBehind(0);
  }, [item.nanoid, source?.url]);

  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;

      if (status === "playing") driftRef.current = Math.max(0, driftRef.current + dt * (1 - speed));
      else if (status === "paused" || status === "loading") driftRef.current += dt;

      let measured = 0;
      if (isYouTube) {
        const { current, duration } = ytTimeRef.current;
        if (duration > 0 && current > 0) measured = Math.max(0, duration - current - 2);
      } else {
        const v = videoRef.current;
        const hls = hlsRef.current;
        if (v) {
          const sync = hls?.liveSyncPosition;
          if (typeof sync === "number" && Number.isFinite(sync)) {
            measured = Math.max(0, sync - v.currentTime);
          } else if (v.seekable.length) {
            const end = v.seekable.end(v.seekable.length - 1);
            if (Number.isFinite(end)) measured = Math.max(0, end - v.currentTime - 10);
          }
        }
      }
      setBehind(Math.max(measured, driftRef.current));
    }, 1000);
    return () => window.clearInterval(id);
  }, [status, speed, isYouTube]);

  const isLiveEdge = behind < LIVE_TOLERANCE;

  const fmtBehind = (sec: number) => {
    const t = Math.round(sec);
    const m = Math.floor(t / 60);
    const ss = t % 60;
    return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${m}:${String(ss).padStart(2, "0")}`;
  };

  /* ------------------------------- pointer surface: tap, double-tap, swipe --------- */
  const clearPendingClick = useCallback(() => {
    if (clickTimer.current) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
  }, []);

  /** Single click / tap → play-pause, deferred so a double-click can claim it first. */
  const surfaceClick = useCallback(() => {
    if (performance.now() < tapRevealUntil.current) return; // tap only revealed the controls
    if (clickTimer.current) return; // second half of a double-click — leave it to onDoubleClick
    clearPendingClick();
    clickTimer.current = window.setTimeout(() => {
      clickTimer.current = null;
      togglePlay();
    }, 240);
  }, [clearPendingClick, togglePlay]);

  /** Double-click / double-tap anywhere on the picture → toggle fullscreen. */
  const surfaceDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      clearPendingClick();
      e.stopPropagation();
      toggleFullscreen();
    },
    [clearPendingClick, toggleFullscreen],
  );

  useEffect(() => clearPendingClick, [clearPendingClick]);

  const swipe = useSwipe({
    onLeft: () => step(1),
    onRight: () => step(-1),
    onUp: mode === "theater" ? () => adjustVolumeRelative(0.12) : undefined,
    onDown: mode === "theater" ? () => adjustVolumeRelative(-0.12) : undefined,
    onTap: surfaceClick,
  });

  // Close the settings popover on an outside press.
  useEffect(() => {
    if (!settingsOpen) return;
    const onDown = (e: PointerEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [settingsOpen]);

  const ytSrc = useMemo(() => {
    if (!isYouTube || !source) return "";
    const id = youtubeId(source.url);
    const params = new URLSearchParams({
      autoplay: "1",
      mute: settings.startMuted ? "1" : "0",
      playsinline: "1",
      enablejsapi: "1",
      // YouTube's own control bar / buttons / overlays are switched off: every
      // control below belongs to this player (play, volume, quality, speed…).
      controls: "0",
      disablekb: "1",
      modestbranding: "1",
      rel: "0",
      iv_load_policy: "3",
      cc_load_policy: "0",
      origin: window.location.origin,
    });
    return `${YT_ORIGIN}/embed/${id}?${params.toString()}`;
  }, [isYouTube, source, settings.startMuted]);


  const showChrome = mode === "mini" || uiVisible || settingsOpen || status !== "playing";
  /** Theater/fullscreen with no recent input: controls faded and cursor hidden. */
  const idle = mode === "theater" && !showChrome;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden bg-black select-none",
        mode === "mini" && "rounded-2xl",
        idle && "player-idle",
      )}
    >
      {isYouTube ? (
        <iframe
          key={ytSrc}
          ref={iframeRef}
          src={ytSrc}
          title={item.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <video
          ref={videoRef}
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full bg-black object-contain"
        />
      )}

      {/* Custom pointer surface — always covers the picture, for both HLS and the YouTube
          embed (whose own controls are disabled). Single click = play/pause, double click =
          fullscreen, swipe = next/previous/volume. Chrome at z-20 still wins over it. */}
      <div
        {...swipe}
        onClick={surfaceClick}
        onDoubleClick={surfaceDoubleClick}
        role="presentation"
        className={cn(
          "absolute inset-0 z-[15]",
          mode === "theater" ? "cursor-pointer touch-none" : "touch-pan-y",
        )}
      />

      {/* Stays mounted in mini-player mode too, so a running scan is never cut off.
          Not available on webcam channels. */}
      {showVision && medium !== "webcams" && (
        <VisionPanel
          liveVideo={videoRef.current}
          youtube={isYouTube}
          minimized={visionHidden || mode === "mini"}
          onMinimize={() => {
            setVisionHidden(true);
            triggerHud("👁", "AI Vision hidden", "Detection keeps running · tap AI Vision to reopen");
          }}
          onStatus={setVisionStatus}
          onClose={() => {
            setShowVision(false);
            setVisionHidden(false);
            setVisionStatus({ scanning: false, names: [] });
          }}
        />
      )}

      {/* Quick feedback HUD (volume changes, next/prev channel, fullscreen) */}
      {hudNotice && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center animate-fade">
          <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/15 bg-black/85 px-6 py-4 shadow-2xl backdrop-blur-xl">
            <span className="text-3xl leading-none">{hudNotice.icon}</span>
            <span className="font-display max-w-[280px] truncate text-center text-sm font-bold text-white">
              {hudNotice.text}
            </span>
            {hudNotice.sub && (
              <span className="text-[10px] uppercase tracking-wider text-white/45">
                {hudNotice.sub}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Floating on-screen Navigation arrows (Visible in Fullscreen & Theater mode) */}
      {mode === "theater" && queue.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            title="Previous channel (Left Arrow / Swipe Right)"
            className={cn(
              "absolute left-4 top-1/2 z-25 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black/60 text-white shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-brand-500 hover:border-transparent active:scale-95",
              showChrome ? "opacity-90 pointer-events-auto" : "opacity-0 pointer-events-none",
            )}
            aria-label="Previous channel"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            title="Next channel (Right Arrow / Swipe Left)"
            className={cn(
              "absolute right-4 top-1/2 z-25 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black/60 text-white shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-brand-500 hover:border-transparent active:scale-95",
              showChrome ? "opacity-90 pointer-events-auto" : "opacity-0 pointer-events-none",
            )}
            aria-label="Next channel"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* loading / error veils */}
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/55">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-brand-500" />
            <p className="text-xs font-medium text-white/70">
              Connecting to source {srcIndex + 1} of {sources.length}…
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        // z-30 so its buttons sit above the gesture layer (z-15) and stay clickable.
        <div className="absolute inset-0 z-[30] grid place-items-center bg-gradient-to-b from-black/80 to-black p-6 text-center">
          <div className="max-w-sm space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-500/15 text-brand-400">
              <Bolt className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold">Signal lost</h3>
            <p className="text-sm text-white/55">{errorMsg || "This stream is not responding."}</p>
            <p className="text-[11px] text-white/35">
              Tried {attempted.length + 1} of {sources.length} source
              {sources.length > 1 ? "s" : ""}. Live streams rotate constantly — try another source or
              channel.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setAttempted([]);
                  setStatus("loading");
                  setSrcIndex(0);
                }}
                className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-brand-500 hover:text-white"
              >
                <Refresh className="h-3.5 w-3.5" /> Retry
              </button>
              {queue.length > 1 && (
                <button
                  type="button"
                  onClick={() => step(1)}
                  className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-white"
                >
                  <Skip className="h-3.5 w-3.5" /> Next channel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* top chrome */}
      <div
        data-chrome
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 bg-gradient-to-b from-black/85 to-transparent p-3 transition-opacity duration-300 sm:p-4",
          showChrome ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="pointer-events-auto flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleMode}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-white hover:text-black"
            aria-label={mode === "theater" ? "Minimise" : "Expand"}
          >
            {mode === "theater" ? <Collapse className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isLiveEdge ? (
                <span className="flex items-center gap-1 rounded bg-brand-500 px-1.5 py-[2px] text-[9px] font-black uppercase tracking-widest text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
                </span>
              ) : (
                <button
                  type="button"
                  onClick={goLive}
                  title="You're behind the live broadcast — jump to live"
                  className="flex items-center gap-1 rounded bg-white/15 px-1.5 py-[2px] text-[9px] font-black uppercase tracking-widest text-white/80 transition hover:bg-brand-500 hover:text-white"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/50" /> −{fmtBehind(behind)} · Go live
                </button>
              )}
              <p className="truncate text-sm font-semibold text-white drop-shadow">{item.name}</p>
            </div>
            {mode === "theater" && (
              <p className="truncate text-[11px] text-white/55">
                {flagEmoji(item.country)} {item.country.toUpperCase()}
                {item.languages.length > 0 && ` · ${item.languages.map(languageName).join(", ")}`}
                {item.isGeoBlocked && " · region-restricted"}
              </p>
            )}
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-1.5">
          {mode === "theater" && (
            <button
              type="button"
              onClick={() => toggleFavorite(medium, item)}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full backdrop-blur transition",
                fav ? "bg-brand-500 text-white" : "bg-black/55 text-white hover:bg-white hover:text-black",
              )}
              aria-label="Toggle My List"
            >
              {fav ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-brand-500"
            aria-label="Close player"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* stats */}
      {showStats && !isYouTube && (
        <div className="absolute left-4 top-20 z-20 w-56 rounded-xl border border-white/10 bg-black/75 p-3 font-mono text-[10px] leading-relaxed text-white/70 backdrop-blur">
          <p className="mb-1 font-sans text-[10px] font-bold uppercase tracking-widest text-brand-400">
            Stream diagnostics
          </p>
          <div className="flex justify-between"><span>resolution</span><span>{stats.res || "—"}</span></div>
          <div className="flex justify-between"><span>bandwidth</span><span>{fmtBitrate(stats.bw)}</span></div>
          <div className="flex justify-between"><span>buffer</span><span>{stats.buffer.toFixed(1)}s</span></div>
          <div className="flex justify-between"><span>dropped</span><span>{stats.dropped}</span></div>
          <div className="flex justify-between"><span>levels</span><span>{levels.length || "—"}</span></div>
          <div className="mt-1 truncate text-white/35">{source?.url}</div>
        </div>
      )}

      {/* bottom chrome */}
      <div
        data-chrome
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 pb-3 pt-10 transition-opacity duration-300 sm:px-4 sm:pb-4",
          showChrome ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black transition hover:scale-105 hover:bg-brand-500 hover:text-white"
            aria-label={status === "playing" ? "Pause" : "Play"}
          >
            {status === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
          </button>

          {mode === "theater" && queue.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                title="Previous channel (Left Arrow / [←] / Swipe Right)"
                className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Previous channel"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                title="Next channel (Right Arrow / [→] / Swipe Left)"
                className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Next channel"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          <div className="group/vol flex items-center gap-1">
            <button
              type="button"
              onClick={() => applyMute(!muted)}
              className="grid h-9 w-9 place-items-center rounded-full text-white/85 transition hover:bg-white/10 hover:text-white"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? <VolumeOff className="h-4 w-4" /> : <Volume className="h-4 w-4" />}
            </button>

            {/* Quick Volume step buttons with Up / Down arrows */}
            <div className="hidden items-center gap-0.5 sm:flex">
              <button
                type="button"
                onClick={() => adjustVolumeRelative(-0.1)}
                title="Volume Down (Down Arrow / Swipe Down)"
                className="grid h-7 w-7 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Volume Down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => adjustVolumeRelative(0.1)}
                title="Volume Up (Up Arrow / Swipe Up)"
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
              onChange={(e) => applyVolume(Number(e.target.value))}
              className="w-0 opacity-0 transition-all duration-300 group-hover/vol:w-20 group-hover/vol:opacity-100 sm:w-16 sm:opacity-100"
              aria-label="Volume"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {mode === "theater" && medium !== "webcams" && (
              <button
                type="button"
                onClick={() => {
                  if (!showVision) {
                    setShowVision(true);
                    setVisionHidden(false);
                  } else {
                    // Open panel → hide it; hidden panel → show it again.
                    setVisionHidden((hidden) => !hidden);
                  }
                }}
                className={cn(
                  "relative grid h-9 w-9 place-items-center rounded-full border transition",
                  showVision && !visionHidden
                    ? "border-mint-400/40 bg-mint-400/12 text-mint-300"
                    : visionStatus.scanning
                      ? "border-mint-400/30 bg-black/35 text-mint-300"
                      : "border-white/12 bg-black/35 text-white/60 hover:border-mint-400/45 hover:text-mint-300",
                )}
                aria-label={
                  !showVision
                    ? "Open AI object and face detection"
                    : visionHidden
                      ? "Show AI vision panel"
                      : "Hide AI vision panel"
                }
                aria-pressed={showVision && !visionHidden}
                title={
                  visionHidden && visionStatus.scanning
                    ? `AI Vision · detecting in background${visionStatus.names.length ? ` · seen: ${visionStatus.names.join(", ")}` : ""}`
                    : "AI Vision"
                }
              >
                <ScanEye className="h-4 w-4" />
                {showVision && visionHidden && visionStatus.scanning && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mint-400" />
                  </span>
                )}
              </button>
            )}

            {item.isGeoBlocked && mode === "theater" && (
              <span className="hidden items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-300 lg:flex">
                <Lock className="h-3 w-3" /> Geo-restricted
              </span>
            )}

            {mode === "theater" && (
              <div ref={settingsRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((open) => !open)}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full transition",
                    settingsOpen
                      ? "bg-white/15 text-white"
                      : "text-white/85 hover:bg-white/10 hover:text-white",
                  )}
                  aria-label="Player settings"
                  aria-expanded={settingsOpen}
                  title="Playback settings"
                >
                  <Settings className="h-4 w-4" />
                </button>

                {settingsOpen && (
                  <div className="absolute bottom-full right-0 mb-3 w-[276px] animate-pop rounded-2xl border border-white/12 bg-ink-950/97 p-3 text-left shadow-[0_24px_60px_-16px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
                    <div
                      className={cn(
                        "mb-3 flex items-center gap-2 rounded-xl border px-2.5 py-2",
                        isLiveEdge ? "border-brand-500/30 bg-brand-500/10" : "border-white/10 bg-white/5",
                      )}
                    >
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        {isLiveEdge && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                        )}
                        <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", isLiveEdge ? "bg-brand-500" : "bg-white/35")} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-white">
                          {isLiveEdge ? "You're watching live" : "Not live"}
                        </p>
                        <p className="truncate text-[9px] text-white/45">
                          {isLiveEdge
                            ? speed !== 1
                              ? `Playing at ${speed}× — you may drift from live`
                              : "In sync with the broadcast"
                            : `${fmtBehind(behind)} behind the live broadcast`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={goLive}
                        disabled={isLiveEdge && speed === 1}
                        className="shrink-0 rounded-lg bg-brand-500 px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-brand-400 disabled:bg-white/10 disabled:text-white/35"
                      >
                        {isLiveEdge && speed === 1 ? "Live" : "Go live"}
                      </button>
                    </div>

                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                        Playback speed
                      </p>
                      <span className="text-[9px] text-white/30">{isYouTube ? "YouTube source" : "Custom player"}</span>
                    </div>
                    <div className="mb-3 flex gap-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setSpeed(rate)}
                          className={cn(
                            "flex-1 rounded-md py-1 text-[10px] font-semibold transition",
                            speed === rate
                              ? "bg-white text-black"
                              : "bg-white/6 text-white/60 hover:bg-white/12 hover:text-white",
                          )}
                        >
                          {rate === 1 ? "1×" : `${rate}×`}
                        </button>
                      ))}
                    </div>

                    <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                      Quality
                    </p>
                    {isYouTube ? (
                      <div className="mb-3 grid grid-cols-5 gap-1">
                        {(
                          [
                            ["default", "Auto"],
                            ["tiny", "144"],
                            ["small", "240"],
                            ["medium", "360"],
                            ["large", "480"],
                            ["hd720", "720"],
                            ["hd1080", "1080"],
                            ["hd1440", "1440"],
                            ["hd2160", "2160"],
                            ["highres", "4K+"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setYtQuality(value)}
                            className={cn(
                              "rounded-md py-1 text-[10px] font-semibold transition",
                              ytQuality === value
                                ? "bg-white text-black"
                                : "bg-white/6 text-white/60 hover:bg-white/12 hover:text-white",
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ) : levels.length > 1 ? (
                      <div className="mb-3 grid grid-cols-4 gap-1">
                        {[-1, ...levels.map((_, i) => i)].map((index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setLevel(index);
                              if (hlsRef.current) hlsRef.current.currentLevel = index;
                            }}
                            className={cn(
                              "truncate rounded-md px-1 py-1 text-[10px] font-semibold transition",
                              level === index
                                ? "bg-white text-black"
                                : "bg-white/6 text-white/60 hover:bg-white/12 hover:text-white",
                            )}
                          >
                            {index === -1
                              ? "Auto"
                              : levels[index]?.height
                                ? `${levels[index].height}p`
                                : fmtBitrate(levels[index]?.bitrate ?? 0)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mb-3 rounded-md bg-white/5 px-2 py-1.5 text-[10px] text-white/40">
                        Stream delivers a single fixed resolution.
                      </p>
                    )}

                    {isYouTube && (
                      <button
                        type="button"
                        onClick={() => setCaptions((on) => !on)}
                        className="mb-3 flex w-full items-center justify-between rounded-md bg-white/6 px-2 py-1.5 text-[10px] font-semibold text-white/70 transition hover:bg-white/12 hover:text-white"
                      >
                        Captions
                        <span className={cn("text-[9px] font-bold uppercase", captions ? "text-mint-400" : "text-white/35")}>
                          {captions ? "On" : "Off"}
                        </span>
                      </button>
                    )}

                    {sources.length > 1 && (
                      <>
                        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                          Source
                        </p>
                        <div className="mb-3 space-y-1">
                          {sources.map((src, i) => (
                            <button
                              key={src.url}
                              type="button"
                              onClick={() => {
                                setStatus("loading");
                                setSrcIndex(i);
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[10px] font-medium transition",
                                srcIndex === i
                                  ? "bg-white/12 text-white"
                                  : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white",
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", srcIndex === i ? "bg-mint-400" : "bg-white/25")} />
                              <span className="truncate">{src.label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {!isYouTube && (
                      <button
                        type="button"
                        onClick={() => setShowStats((on) => !on)}
                        className="flex w-full items-center justify-between rounded-md bg-white/6 px-2 py-1.5 text-[10px] font-semibold text-white/70 transition hover:bg-white/12 hover:text-white"
                      >
                        Stream diagnostics
                        <span className={cn("text-[9px] font-bold uppercase", showStats ? "text-mint-400" : "text-white/35")}>
                          {showStats ? "On" : "Off"}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {!isYouTube && (
              <button
                type="button"
                onClick={requestPip}
                className="grid h-9 w-9 place-items-center rounded-full text-white/85 transition hover:bg-white/10 hover:text-white"
                aria-label="Picture in picture"
              >
                <Pip className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="grid h-9 w-9 place-items-center rounded-full text-white/85 transition hover:bg-white/10 hover:text-white"
              aria-label="Fullscreen"
            >
              {isFs ? <Collapse className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

