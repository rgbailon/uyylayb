import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Item, Medium, SavedEntry } from "@/types";
import { itemKey } from "@/lib/catalog";
import { ensureLogoIndex, setArtworkEnabled } from "@/lib/logos";

const LS = {
  favorites: "famelack.favorites.v1",
  history: "famelack.history.v1",
  settings: "famelack.settings.v1",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — ignore */
  }
}

export interface Settings {
  artwork: boolean;
  autoAdvance: boolean;
  startMuted: boolean;
  hideGeoBlocked: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  artwork: true,
  autoAdvance: true,
  startMuted: false,
  hideGeoBlocked: false,
};

export type VideoMode = "theater" | "mini";

export interface VideoSession {
  item: Item;
  medium: Medium;
  mode: VideoMode;
  queue: Item[];
  token: number;
}

export interface AudioSession {
  item: Item;
  queue: Item[];
}

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "success" | "warn";
}

interface Ctx {
  favorites: SavedEntry[];
  history: SavedEntry[];
  isFavorite: (medium: Medium, item: Item) => boolean;
  toggleFavorite: (medium: Medium, item: Item) => void;
  clearHistory: () => void;
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  pushToast: (message: string, tone?: Toast["tone"]) => void;
  video: VideoSession | null;
  audio: AudioSession | null;
  playVideo: (item: Item, medium: Medium, queue?: Item[]) => void;
  /** Swap the currently playing item WITHOUT remounting the player —
   *  keeps fullscreen, keeps the play queue, keeps the current mode. */
  switchChannel: (item: Item, queue?: Item[]) => void;
  setVideoMode: (mode: VideoMode) => void;
  closeVideo: () => void;
  playAudio: (item: Item, queue?: Item[]) => void;
  stopAudio: () => void;
  stepAudio: (dir: 1 | -1) => void;
}

const AppCtx = createContext<Ctx | null>(null);
/** Separate context so showing a toast doesn't re-render every channel card. */
const ToastCtx = createContext<Toast[]>([]);

export function AppProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<SavedEntry[]>(() => read<SavedEntry[]>(LS.favorites, []));
  const [history, setHistory] = useState<SavedEntry[]>(() => read<SavedEntry[]>(LS.history, []));
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...read<Partial<Settings>>(LS.settings, {}),
  }));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [video, setVideo] = useState<VideoSession | null>(null);
  const [audio, setAudio] = useState<AudioSession | null>(null);
  const tokenRef = useRef(0);

  useEffect(() => write(LS.favorites, favorites), [favorites]);
  useEffect(() => write(LS.history, history), [history]);
  useEffect(() => write(LS.settings, settings), [settings]);

  useEffect(() => {
    setArtworkEnabled(settings.artwork);
    if (!settings.artwork) return;
    const run = () => void ensureLogoIndex();
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(run);
    else setTimeout(run, 1200);
  }, [settings.artwork]);

  const pushToast = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const isFavorite = useCallback(
    (medium: Medium, item: Item) => favorites.some((f) => f.key === itemKey(medium, item)),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (medium: Medium, item: Item) => {
      const key = itemKey(medium, item);
      setFavorites((prev) => {
        const exists = prev.some((f) => f.key === key);
        if (exists) {
          pushToast(`Removed “${item.name}” from My List`);
          return prev.filter((f) => f.key !== key);
        }
        pushToast(`Added “${item.name}” to My List`, "success");
        return [{ key, medium, item, at: Date.now() }, ...prev].slice(0, 500);
      });
    },
    [pushToast],
  );

  const recordPlay = useCallback((medium: Medium, item: Item) => {
    const key = itemKey(medium, item);
    setHistory((prev) => {
      const existing = prev.find((h) => h.key === key);
      const rest = prev.filter((h) => h.key !== key);
      return [
        { key, medium, item, at: Date.now(), count: (existing?.count ?? 0) + 1 },
        ...rest,
      ].slice(0, 120);
    });
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const updateSetting = useCallback<Ctx["updateSetting"]>((key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const playVideo = useCallback(
    (item: Item, medium: Medium, queue: Item[] = []) => {
      setAudio(null);
      tokenRef.current += 1;
      setVideo({ item, medium, mode: "theater", queue, token: tokenRef.current });
      recordPlay(medium, item);
    },
    [recordPlay],
  );

  /**
   * Channel surfing inside an open player.
   *
   * Deliberately does NOT bump `token`: the player is keyed by token, so bumping
   * it would unmount the <video>/container node — and because that node is the
   * fullscreen element, the browser would silently kick you out of fullscreen.
   * Here we only swap `item` (and the queue if one is provided) and leave
   * `mode`, `token` and the DOM node completely alone.
   */
  const videoSessionRef = useRef<VideoSession | null>(null);
  videoSessionRef.current = video;

  const switchChannel = useCallback(
    (item: Item, queue?: Item[]) => {
      const current = videoSessionRef.current;
      if (!current) return;
      if (current.item.nanoid === item.nanoid) return;
      setVideo((v) => (v ? { ...v, item, queue: queue && queue.length ? queue : v.queue } : v));
      recordPlay(current.medium, item);
    },
    [recordPlay],
  );

  const setVideoMode = useCallback((mode: VideoMode) => {
    setVideo((v) => (v ? { ...v, mode } : v));
  }, []);

  const closeVideo = useCallback(() => setVideo(null), []);

  const playAudio = useCallback(
    (item: Item, queue: Item[] = []) => {
      setVideo(null);
      setAudio({ item, queue });
      recordPlay("radio", item);
    },
    [recordPlay],
  );

  const stopAudio = useCallback(() => setAudio(null), []);

  const stepAudio = useCallback(
    (dir: 1 | -1) => {
      setAudio((a) => {
        if (!a || a.queue.length < 2) return a;
        const idx = a.queue.findIndex((i) => i.nanoid === a.item.nanoid);
        const next = a.queue[(idx + dir + a.queue.length) % a.queue.length];
        recordPlay("radio", next);
        return { item: next, queue: a.queue };
      });
    },
    [recordPlay],
  );

  const value = useMemo<Ctx>(
    () => ({
      favorites,
      history,
      isFavorite,
      toggleFavorite,
      clearHistory,
      settings,
      updateSetting,
      pushToast,
      video,
      audio,
      playVideo,
      switchChannel,
      setVideoMode,
      closeVideo,
      playAudio,
      stopAudio,
      stepAudio,
    }),
    [
      favorites,
      history,
      isFavorite,
      toggleFavorite,
      clearHistory,
      settings,
      updateSetting,
      pushToast,
      video,
      audio,
      playVideo,
      switchChannel,
      setVideoMode,
      closeVideo,
      playAudio,
      stopAudio,
      stepAudio,
    ],
  );

  return <AppCtx.Provider value={value}>
      <ToastCtx.Provider value={toasts}>{children}</ToastCtx.Provider>
    </AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function useToasts(): Toast[] {
  return useContext(ToastCtx);
}
