import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { VisionBox } from "@/lib/vision";
import { getVisionEngine, isSecurityError, type VisionEngine } from "@/lib/visionEngine";
import {
  MAX_PEOPLE,
  SAMPLES_REQUIRED,
  addSample,
  matchFaces,
  readKnownPeople,
  validateEnrollment,
  writeKnownPeople,
  type KnownPerson,
} from "@/lib/faceId";
import { cn } from "@/lib/utils";
import { ChevronDown, Close, ScanEye } from "@/components/Icons";

type InputMode = "live" | "clip" | "camera";

interface Props {
  liveVideo: HTMLVideoElement | null;
  youtube: boolean;
  /** Hidden = fully out of sight; detection keeps running in the background. */
  minimized: boolean;
  onMinimize: () => void;
  onClose: () => void;
  /** Reports scan activity so the toolbar button can show a live indicator. */
  onStatus?: (status: { scanning: boolean; names: string[] }) => void;
}

function formatError(error: unknown, mode: InputMode): string {
  const message = error instanceof Error ? error.message : String(error);
  if (isSecurityError(error) || /pixel data/i.test(message)) {
    return "This live stream blocks frame access (CORS). Playback is unaffected. Try a local CCTV clip or your device camera instead.";
  }
  if ((mode === "live" || mode === "camera") && /video|image|element|ready/i.test(message)) {
    return "The live video is not ready for frame analysis yet. Wait for playback, then start the scan again.";
  }
  return message || "The detector could not read this video frame.";
}

function drawDetections(canvas: HTMLCanvasElement, video: HTMLVideoElement, boxes: VisionBox[]) {
  const parent = canvas.parentElement;
  if (!parent || !video.videoWidth || !video.videoHeight) return;

  const bounds = parent.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(bounds.width * dpr);
  canvas.height = Math.round(bounds.height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, bounds.width, bounds.height);

  // Match the video's object-contain letterboxing so boxes land on the image.
  const scale = Math.min(bounds.width / video.videoWidth, bounds.height / video.videoHeight);
  const offsetX = (bounds.width - video.videoWidth * scale) / 2;
  const offsetY = (bounds.height - video.videoHeight * scale) / 2;

  for (const detection of boxes) {
    const [x, y, w, h] = detection.bbox;
    const left = offsetX + x * scale;
    const top = offsetY + y * scale;
    const width = w * scale;
    const height = h * scale;
    const color = detection.identified ? "#ffd166" : detection.kind === "face" ? "#e879f9" : "#2ee6a8";
    const label = detection.score === undefined
      ? detection.label
      : `${detection.label} ${Math.round(detection.score * 100)}%`;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(left, top, width, height);

    ctx.font = "600 12px Inter, system-ui, sans-serif";
    const labelWidth = ctx.measureText(label).width + 14;
    const labelTop = Math.max(0, top - 23);
    ctx.fillStyle = color;
    ctx.fillRect(left, labelTop, labelWidth, 21);
    ctx.fillStyle = "#08080c";
    ctx.fillText(label, left + 7, labelTop + 14.5);
  }
}

export function VisionPanel({
  liveVideo,
  youtube,
  minimized,
  onMinimize,
  onClose,
  onStatus,
}: Props) {
  const [inputMode, setInputMode] = useState<InputMode>(youtube ? "clip" : "live");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [engine, setEngine] = useState<VisionEngine | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [detections, setDetections] = useState<VisionBox[]>([]);
  const [objectsOn, setObjectsOn] = useState(true);
  const [facesOn, setFacesOn] = useState(true);
  const [confidence, setConfidence] = useState(0.42);
  const [fps, setFps] = useState(0);
  const [people, setPeople] = useState<KnownPerson[]>(() => readKnownPeople());
  const [recognitionOn, setRecognitionOn] = useState(false);
  const [enrollName, setEnrollName] = useState("");
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState<KnownPerson | null>(null);
  const [enrollMsg, setEnrollMsg] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<VisionEngine | null>(null);
  /** User explicitly paused the CCTV clip (so we don't auto-resume it while hidden). */
  const clipUserPausedRef = useRef(false);
  const mountedRef = useRef(true);
  const inputModeRef = useRef(inputMode);
  inputModeRef.current = inputMode;

  const objectCount = detections.filter((d) => d.kind === "object").length;
  const faceCount = detections.filter((d) => d.kind === "face").length;
  const namedFaces = detections.filter((d) => d.identified).map((d) => d.label);
  const classCounts = useMemo(() => {
    const counts = new Map<string, number>();
    detections.forEach((d) => counts.set(d.label, (counts.get(d.label) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [detections]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (youtube) {
      setInputMode("clip");
      setScanning(false);
      setDetections([]);
      setCameraStream(null);
    }
  }, [youtube]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  useEffect(() => {
    const video = cameraVideoRef.current;
    if (!cameraStream || !video) return;
    video.srcObject = cameraStream;
    void video.play().catch(() => undefined);
    return () => {
      video.srcObject = null;
      cameraStream.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = inputMode === "live"
      ? liveVideo
      : inputMode === "clip"
        ? fileVideoRef.current
        : cameraVideoRef.current;
    if (!canvas || !video) return;

    const paint = () => drawDetections(canvas, video, detections);
    const observer = new ResizeObserver(paint);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    window.addEventListener("resize", paint);
    paint();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", paint);
    };
  }, [detections, fileUrl, inputMode, liveVideo, cameraStream]);

  /* Live settings are read through a ref so toggling them never restarts — or aborts — a scan. */
  const live = useRef({ inputMode, liveVideo, objectsOn, facesOn, confidence, recognitionOn, people, minimized });
  live.current = { inputMode, liveVideo, objectsOn, facesOn, confidence, recognitionOn, people, minimized };

  useEffect(() => {
    if (!scanning || !engine) return;
    let stopped = false;
    let timer = 0;
    let failures = 0;
    let previousAt = performance.now();

    const sourceVideo = () => {
      const { inputMode: mode, liveVideo: lv } = live.current;
      return mode === "live" ? lv : mode === "clip" ? fileVideoRef.current : cameraVideoRef.current;
    };

    const scan = async () => {
      if (stopped) return;
      const cfg = live.current;
      const video = sourceVideo();

      // Tab in background: browsers throttle anyway — idle cheaply and resume when visible.
      if (document.hidden) {
        timer = window.setTimeout(scan, 800);
        return;
      }

      // Keep camera / clip sources running while the panel is hidden, so frames never freeze.
      if (video && cfg.inputMode !== "live" && video.paused && !video.ended) {
        if (cfg.inputMode === "camera" || !clipUserPausedRef.current) void video.play().catch(() => undefined);
      }

      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
        timer = window.setTimeout(scan, 400); // e.g. between channels — wait, don't abort
        return;
      }

      let inferenceMs = 300;
      try {
        // Naming is limited to the user's own camera/footage and enrolled people.
        const recognize =
          cfg.recognitionOn && cfg.facesOn && cfg.inputMode !== "live" && cfg.people.length > 0;
        const result = await engine.detect(video, {
          objects: cfg.objectsOn,
          faces: cfg.facesOn && !recognize,
          recognize,
          confidence: cfg.confidence,
        });
        if (stopped) return;
        inferenceMs = result.ms;
        failures = 0;

        const objects: VisionBox[] = result.objects.map((o) => ({ kind: "object", ...o }));
        const faces: VisionBox[] = recognize
          ? matchFaces(result.faces, cfg.people)
          : result.faces.map((f) => ({ kind: "face", label: "Face", score: f.score, bbox: f.bbox }));
        setDetections([...objects, ...faces]);
        setError("");

        const now = performance.now();
        setFps(1000 / Math.max(1, now - previousAt));
        previousAt = now;
      } catch (cause) {
        if (stopped) return;
        if (isSecurityError(cause)) {
          // Cross-origin streams genuinely can't be read — the only error that ends a scan.
          setError(formatError(cause, cfg.inputMode));
          setScanning(false);
          return;
        }
        failures += 1;
        if (failures >= 8) {
          setError(formatError(cause, cfg.inputMode));
          setScanning(false);
          return;
        }
        timer = window.setTimeout(scan, 1000); // transient (frame swap, decoder hiccup) — retry
        return;
      }

      // Adaptive pace: slower devices scan less often instead of starving the video.
      const delay = Math.min(1500, Math.max(250, inferenceMs * 1.25));
      if (!stopped) timer = window.setTimeout(scan, delay);
    };

    void scan();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [scanning, engine]);

  // Switching source clears stale boxes but keeps scanning.
  useEffect(() => {
    setDetections([]);
  }, [inputMode, fileUrl, cameraStream]);

  const namesKey = namedFaces.join("|");
  useEffect(() => {
    onStatus?.({ scanning, names: namesKey ? namesKey.split("|") : [] });
  }, [scanning, namesKey, onStatus]);

  const savePeople = (next: KnownPerson[]) => {
    setPeople(next);
    writeKnownPeople(next);
  };

  const captureSample = async () => {
    const video = cameraVideoRef.current;
    const name = enrollName.trim().slice(0, 40);
    if (inputMode !== "camera" || !cameraStream || !video) {
      setEnrollMsg("Enrollment only works from the live device camera, with the person present.");
      return;
    }
    if (!name) return setEnrollMsg("Enter the person's name first.");
    if (!consent) return setEnrollMsg("Confirm the person has agreed to be enrolled.");
    if (!draft && people.length >= MAX_PEOPLE) return setEnrollMsg(`You can enroll up to ${MAX_PEOPLE} people.`);
    if (!draft && people.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return setEnrollMsg("Someone with that name is already enrolled.");
    }

    setEnrolling(true);
    setEnrollMsg("Loading face recognition…");
    try {
      const eng = engineRef.current ?? (await getVisionEngine());
      engineRef.current = eng;
      setEngine((cur) => cur ?? eng);
      const frame = await eng.detect(video, { objects: false, faces: false, recognize: true, confidence: 0.5 });
      const result = validateEnrollment(frame.faces);
      if (!result.ok) {
        setEnrollMsg(result.reason);
        return;
      }
      const base: KnownPerson = draft ?? { id: crypto.randomUUID(), name, descriptors: [], consentAt: Date.now() };
      const updated = addSample(base, result.descriptor);
      if (updated.descriptors.length >= SAMPLES_REQUIRED) {
        savePeople([...people, updated]);
        setDraft(null);
        setEnrollName("");
        setConsent(false);
        setRecognitionOn(true);
        setEnrollMsg(`${updated.name} enrolled. Their name will appear when the match is accurate.`);
      } else {
        setDraft(updated);
        setEnrollMsg(`Sample ${updated.descriptors.length}/${SAMPLES_REQUIRED} captured. Turn the head slightly and capture again.`);
      }
    } catch (cause) {
      setEnrollMsg(cause instanceof Error ? cause.message : "Could not read the camera frame.");
    } finally {
      if (mountedRef.current) setEnrolling(false);
    }
  };

  const chooseInput = (mode: InputMode) => {
    setScanning(false);
    setDetections([]);
    setError("");
    if (inputMode === "camera" && mode !== "camera") setCameraStream(null);
    setInputMode(mode);
  };

  const enableDeviceCamera = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access requires a secure browser context and a supported device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (!mountedRef.current || inputModeRef.current !== "camera") {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setCameraStream(stream);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Camera permission was not granted.");
    }
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Choose a video file such as MP4, MOV or WebM.");
      return;
    }
    setScanning(false);
    setDetections([]);
    setError("");
    setCameraStream(null);
    setFileName(file.name);
    setFileUrl(URL.createObjectURL(file));
    setInputMode("clip");
    event.target.value = "";
  };

  const startScan = async () => {
    const requestedMode = inputMode;
    setError("");
    setDetections([]);
    const video = inputMode === "live"
      ? liveVideo
      : inputMode === "clip"
        ? fileVideoRef.current
        : cameraVideoRef.current;
    if (inputMode === "live" && youtube) {
      setError("YouTube protects its video frames from browser access. Upload a local clip to scan it.");
      return;
    }
    if (inputMode === "clip" && !fileUrl) {
      fileInputRef.current?.click();
      return;
    }
    if (inputMode === "camera" && !cameraStream) {
      setError("Enable the device camera preview before starting detection.");
      return;
    }
    if (!objectsOn && !facesOn) {
      setError("Turn on object detection, face detection, or both before scanning.");
      return;
    }
    if (!video) {
      setError(inputMode === "live" ? "The live video element is not available." : "Choose a CCTV clip first.");
      return;
    }

    setLoadingModels(true);
    try {
      // Everything below loads inside the background worker — the video keeps playing smoothly.
      const eng = engineRef.current ?? (await getVisionEngine());
      await eng.ensure({ objects: objectsOn, faces: facesOn, recognize: false });
      if (!mountedRef.current || inputModeRef.current !== requestedMode) return;
      engineRef.current = eng;
      setEngine(eng);
      if (inputMode === "clip" && video.paused) {
        clipUserPausedRef.current = false;
        await video.play().catch(() => undefined);
      }
      setScanning(true);
    } catch (cause) {
      if (mountedRef.current && inputModeRef.current === requestedMode) {
        setError(cause instanceof Error ? cause.message : "Could not load the browser AI models.");
      }
    } finally {
      if (mountedRef.current) setLoadingModels(false);
    }
  };

  const stopScan = () => setScanning(false);

  return (
    <>
      {inputMode === "live" && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[21] h-full w-full"
        />
      )}
      <section
        data-vision-panel
        data-hidden={minimized ? "true" : undefined}
        aria-hidden={minimized || undefined}
        // \`inert\` blocks focus/clicks while hidden; React 19 accepts the boolean attribute.
        inert={minimized || undefined}
        className={cn(
          "absolute right-3 top-[4.25rem] z-40 flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-ink-950/95 shadow-[0_28px_90px_-20px_rgba(0,0,0,0.92)] transition-opacity duration-200",
          "max-h-[calc(100%-6rem)] w-[min(92vw,370px)]",
          // Invisible but NOT display:none — browsers pause display:none videos, which froze
          // camera/clip frames and stalled scanning. Opacity 0 keeps them decoding.
          minimized ? "pointer-events-none opacity-0" : "opacity-100 backdrop-blur-2xl",
        )}
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-white/8 px-4 py-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint-400/12 text-mint-400">
            <ScanEye className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold text-white">AI vision</h2>
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                scanning ? "bg-mint-400/15 text-mint-400" : "bg-white/8 text-white/45",
              )}>
                {scanning ? "Scanning" : "On-device"}
              </span>
            </div>
              <p className="mt-0.5 text-[10px] leading-relaxed text-white/40">
                Objects + face boxes · no identity recognition
              </p>
          </div>
          <button
            type="button"
            onClick={onMinimize}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
            aria-label="Minimize AI vision"
            title="Hide panel (detection keeps running) — reopen from AI Vision"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
            aria-label="Close AI vision"
          >
            <Close className="h-4 w-4" />
          </button>
        </div>

        <div className={cn(
          "no-scrollbar min-h-0 flex-1 overflow-y-auto transition-all duration-200",
        )}>
          <div className="grid grid-cols-3 gap-1.5 p-3 pb-2">
            <button
              type="button"
              disabled={youtube}
              onClick={() => chooseInput("live")}
              className={cn(
                "rounded-xl border px-2.5 py-2 text-left transition",
                inputMode === "live"
                  ? "border-mint-400/45 bg-mint-400/10 text-white"
                  : "border-white/8 text-white/55 hover:border-white/20",
                youtube && "cursor-not-allowed opacity-35",
              )}
            >
              <span className="block text-[11px] font-semibold">Live stream</span>
              <span className="mt-0.5 block text-[9px] text-white/35">
                {youtube ? "Protected iframe" : "CORS permitting"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => chooseInput("clip")}
              className={cn(
                "rounded-xl border px-2.5 py-2 text-left transition",
                inputMode === "clip"
                  ? "border-iris-400/45 bg-iris-500/10 text-white"
                  : "border-white/8 text-white/55 hover:border-white/20",
              )}
            >
              <span className="block text-[11px] font-semibold">CCTV clip</span>
              <span className="mt-0.5 block text-[9px] text-white/35">MP4 · MOV · WebM</span>
            </button>
            <button
              type="button"
              onClick={() => chooseInput("camera")}
              className={cn(
                "rounded-xl border px-2.5 py-2 text-left transition",
                inputMode === "camera"
                  ? "border-brand-400/45 bg-brand-500/10 text-white"
                  : "border-white/8 text-white/55 hover:border-white/20",
              )}
            >
              <span className="block text-[11px] font-semibold">Live camera</span>
              <span className="mt-0.5 block text-[9px] text-white/35">Device camera</span>
            </button>
          </div>

          {inputMode === "live" && (
            <div className="mx-3 mb-3 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-white/80">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
                {youtube ? "Live scan unavailable" : "Current player feed"}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-white/40">
                {youtube
                  ? "YouTube runs in a protected iframe. Switch to a local clip to analyze video frames."
                  : "Live detection reads frames from this player. Some broadcasters block browser frame access; if so, playback keeps going and you can use a local clip or device camera instead."}
              </p>
            </div>
          )}

          {inputMode === "clip" && (
            <div className="px-3 pb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.mp4,.mov,.webm,.m4v"
                onChange={onFile}
                className="sr-only"
                aria-label="Choose local CCTV video"
              />
              {fileUrl ? (
                <div className="space-y-2">
                  <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                    <video
                      ref={fileVideoRef}
                      src={fileUrl}
                      controls
                      muted
                      playsInline
                      preload="metadata"
                      onEnded={() => setScanning(false)}
                      onPlay={() => {
                        clipUserPausedRef.current = false;
                      }}
                      onPause={(e) => {
                        // Only a pause made from the visible controls counts as the user's choice.
                        if (!live.current.minimized && !e.currentTarget.ended) clipUserPausedRef.current = true;
                      }}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                    <canvas
                      ref={canvasRef}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[10px] text-white/55" title={fileName}>
                      {fileName}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 rounded-full border border-white/12 px-2.5 py-1 text-[10px] font-semibold text-white/60 transition hover:border-white/35 hover:text-white"
                    >
                      Change clip
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.025] px-4 py-6 text-center transition hover:border-iris-400/50 hover:bg-iris-500/5"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/8 text-white/65">
                    <ScanEye className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold text-white/85">Choose CCTV footage</span>
                  <span className="text-[10px] text-white/35">Video stays on this device</span>
                </button>
              )}
            </div>
          )}

          {inputMode === "camera" && (
            <div className="px-3 pb-3">
              <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-contain"
                />
                <canvas
                  ref={canvasRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                />
                {!cameraStream && (
                  <div className="absolute inset-0 grid place-items-center bg-black/60 p-4 text-center">
                    <div>
                      <p className="text-xs font-semibold text-white/85">Camera access is off</p>
                      <p className="mt-1 text-[10px] text-white/40">Your camera is only used for local detection.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="truncate text-[10px] text-white/45">
                  {cameraStream ? "Live device camera · processing stays local" : "Rear camera preferred when available"}
                </p>
                {cameraStream ? (
                  <button
                    type="button"
                    onClick={() => {
                      setScanning(false);
                      setCameraStream(null);
                    }}
                    className="shrink-0 rounded-full border border-white/12 px-2.5 py-1 text-[10px] font-semibold text-white/60 transition hover:border-white/35 hover:text-white"
                  >
                    Stop camera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={enableDeviceCamera}
                    className="shrink-0 rounded-full border border-brand-400/35 bg-brand-500/10 px-2.5 py-1 text-[10px] font-semibold text-brand-300 transition hover:bg-brand-500/20"
                  >
                    Enable camera
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mx-3 border-t border-white/8 py-3">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
              Detection targets
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setObjectsOn((value) => !value)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition",
                  objectsOn ? "border-mint-400/25 bg-mint-400/[0.06]" : "border-white/8 bg-white/[0.02] opacity-55",
                )}
              >
                <span className={cn("h-2 w-2 rounded-sm", objectsOn ? "bg-mint-400" : "bg-white/25")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold text-white/85">Objects</span>
                  <span className="block text-[9px] text-white/35">People, vehicles, 80 classes</span>
                </span>
                <span className="font-mono text-[11px] text-mint-400">{objectCount}</span>
              </button>
              <button
                type="button"
                onClick={() => setFacesOn((value) => !value)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition",
                  facesOn ? "border-iris-400/25 bg-iris-500/[0.06]" : "border-white/8 bg-white/[0.02] opacity-55",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", facesOn ? "bg-iris-400" : "bg-white/25")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold text-white/85">Faces</span>
                  <span className="block text-[9px] text-white/35">Unknown unless enrolled</span>
                </span>
                <span className="font-mono text-[11px] text-iris-400">{faceCount}</span>
              </button>
            </div>

            <label className="mt-3 flex items-center gap-3">
              <span className="shrink-0 text-[10px] text-white/45">Object confidence</span>
              <input
                type="range"
                min={0.2}
                max={0.85}
                step={0.05}
                value={confidence}
                onChange={(event) => setConfidence(Number(event.target.value))}
                className="min-w-0 flex-1"
                aria-label="Object confidence threshold"
              />
              <span className="w-8 text-right font-mono text-[10px] text-white/55">
                {Math.round(confidence * 100)}%
              </span>
            </label>
          </div>

          {facesOn && (
            <div className="mx-3 border-t border-white/8 py-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                  Known people · {people.length}/{MAX_PEOPLE}
                </p>
                <button
                  type="button"
                  disabled={people.length === 0}
                  onClick={() => setRecognitionOn((v) => !v)}
                  aria-pressed={recognitionOn}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition disabled:opacity-35",
                    recognitionOn
                      ? "border-amber-glow/40 bg-amber-glow/10 text-amber-glow"
                      : "border-white/12 text-white/45 hover:text-white/75",
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", recognitionOn ? "bg-amber-glow" : "bg-white/30")} />
                  Name faces {recognitionOn ? "on" : "off"}
                </button>
              </div>

              <p className="mb-2 text-[9px] leading-relaxed text-white/40">
                Names appear only for people you enrolled, only on your camera or local clips, and only when the match is strong. Everyone else stays “Unknown face”. Public streams are never named.
              </p>

              {recognitionOn && inputMode === "live" && (
                <p className="mb-2 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[9px] text-white/50">
                  Naming is paused on public broadcasts. Switch to Live camera or CCTV clip.
                </p>
              )}

              {people.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {people.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-glow" />
                      <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-white/85">{p.name}</span>
                      <span className="text-[9px] text-white/30">{p.descriptors.length} samples</span>
                      <button
                        type="button"
                        onClick={() => savePeople(people.filter((x) => x.id !== p.id))}
                        className="text-[9px] font-semibold text-white/40 transition hover:text-brand-400"
                        aria-label={`Delete ${p.name}`}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {inputMode === "camera" && cameraStream ? (
                <div className="space-y-2 rounded-xl border border-amber-glow/15 bg-amber-glow/[0.04] p-2.5">
                  <p className="text-[10px] font-semibold text-white/80">
                    {draft ? `Enrolling ${draft.name}` : "Enroll a person (in front of this camera)"}
                  </p>
                  {!draft && (
                    <input
                      value={enrollName}
                      onChange={(e) => setEnrollName(e.target.value)}
                      placeholder="Person's name"
                      maxLength={40}
                      className="w-full rounded-lg border border-white/12 bg-ink-850 px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-amber-glow/50"
                    />
                  )}
                  {!draft && (
                    <label className="flex items-start gap-2 text-[9px] leading-relaxed text-white/55">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 accent-amber-400"
                      />
                      This person is present and has agreed to have their face enrolled on this device.
                    </label>
                  )}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={captureSample}
                      disabled={enrolling}
                      className="flex-1 rounded-lg bg-amber-glow px-3 py-1.5 text-[10px] font-bold text-ink-950 transition hover:brightness-110 disabled:opacity-50"
                    >
                      {enrolling
                        ? "Capturing…"
                        : `Capture sample ${(draft?.descriptors.length ?? 0) + 1}/${SAMPLES_REQUIRED}`}
                    </button>
                    {draft && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(null);
                          setEnrollMsg("Enrollment cancelled.");
                        }}
                        className="rounded-lg border border-white/12 px-3 py-1.5 text-[10px] font-semibold text-white/60 hover:text-white"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  {enrollMsg && <p className="text-[9px] leading-relaxed text-white/55">{enrollMsg}</p>}
                </div>
              ) : (
                <p className="text-[9px] text-white/35">
                  To enroll someone, open <span className="text-white/60">Live camera</span> and enable it with the person in front of the camera.
                </p>
              )}

              {people.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    savePeople([]);
                    setRecognitionOn(false);
                  }}
                  className="mt-2 text-[9px] font-semibold text-white/35 underline decoration-white/15 underline-offset-2 hover:text-brand-400"
                >
                  Delete all face data
                </button>
              )}
            </div>
          )}

          <div className="px-3 pb-3">
            {error && (
              <div className="mb-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-[10px] leading-relaxed text-amber-100/75">
                {error}
              </div>
            )}

            {scanning && (
              <div className="mb-2 flex items-center justify-between rounded-xl border border-mint-400/20 bg-mint-400/[0.05] px-3 py-2">
                <span className="flex items-center gap-2 text-[10px] font-semibold text-mint-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint-400" />
                  Scanning this frame stream
                </span>
                <span className="font-mono text-[10px] text-white/45">{fps.toFixed(1)} fps</span>
              </div>
            )}

            <button
              type="button"
              onClick={scanning ? stopScan : startScan}
              disabled={loadingModels || (!objectsOn && !facesOn)}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
                scanning
                  ? "border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                  : "bg-mint-400 text-ink-950 hover:bg-mint-300",
              )}
            >
              {loadingModels ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                  Loading browser AI…
                </>
              ) : scanning ? (
                "Stop scan"
              ) : (
                <>
                  <ScanEye className="h-4 w-4" />
                  {engine ? "Start detection" : "Load models & scan"}
                </>
              )}
            </button>

            {classCounts.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                    Current frame
                  </p>
                  <p className="font-mono text-[9px] text-white/30">
                    {detections.length} detection{detections.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {classCounts.slice(0, 8).map(([name, count]) => (
                    <span
                      key={name}
                      className={cn(
                        "rounded-md border px-2 py-1 text-[10px] font-medium",
                        namedFaces.includes(name)
                          ? "border-amber-glow/30 bg-amber-glow/10 text-amber-glow"
                          : name === "Face" || name === "Unknown face"
                          ? "border-iris-400/20 bg-iris-500/10 text-iris-300"
                          : "border-mint-400/20 bg-mint-400/8 text-mint-300",
                      )}
                    >
                      {name} <span className="opacity-65">×{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {engine && (
              <p className="mt-2 text-right font-mono text-[9px] text-white/25">
                {engine.backend.toUpperCase()} · {engine.kind === "worker" ? "background thread" : "main thread"} · local inference
              </p>
            )}
          </div>
        </div>

        {(
          <div className="border-t border-white/8 px-3 py-2.5">
            <p className="text-[9px] leading-relaxed text-white/35">
              Frames stay on this device; model weights download on first use. Unknown faces are never named or stored; enrolled face data stays in this browser. Inspired by{" "}
              <a
                href="https://github.com/lakshan-bandara/cctv-footage-object-detection"
                target="_blank"
                rel="noreferrer"
                className="text-white/60 underline decoration-white/20 underline-offset-2 hover:text-mint-400"
              >
                YOLOv8 CCTV detection
              </a>
              .
            </p>
          </div>
        )}
      </section>
    </>
  );
}
