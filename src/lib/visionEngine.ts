/**
 * AI Vision engine — keeps ALL heavy work off the main thread.
 *
 * Why: model download/parse, WebGL shader compilation and every inference pass
 * used to run on the same thread that drives video playback and the UI, which
 * caused visible stutter while AI Vision loaded and while it scanned.
 *
 * How: a module Web Worker (built from a Blob, since the app ships as a single
 * HTML file) loads TensorFlow.js + COCO-SSD + face-api with its own
 * OffscreenCanvas/WebGL context. The page only grabs a small downscaled frame
 * with createImageBitmap (decoded off-thread) and *transfers* it — zero copies.
 * If the browser can't run the worker, we fall back to the main thread with
 * downscaled frames and yielding, so features keep working everywhere.
 */
import { FACE_MODEL_URL, loadFaceNet, loadRuntime } from "@/lib/ml";
import { COCO_LABELS, COCO_URL, detectObjectsFromTensorSource } from "@/lib/vision";

const RUNTIME_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.esm.js";

export interface Want {
  objects: boolean;
  faces: boolean;
  /** Landmarks + 128-d descriptors (needed for naming enrolled people). */
  recognize: boolean;
}

export interface RawObject {
  label: string;
  score: number;
  bbox: [number, number, number, number];
}
export interface RawFace {
  score: number;
  bbox: [number, number, number, number];
  descriptor?: number[];
}
export interface FrameResult {
  objects: RawObject[];
  faces: RawFace[];
  /** Inference time in ms (used to adapt scan rate to the device). */
  ms: number;
}

export interface DetectOptions extends Want {
  confidence: number;
}

export interface VisionEngine {
  kind: "worker" | "main";
  backend: string;
  ensure(want: Want): Promise<void>;
  detect(video: HTMLVideoElement, options: DetectOptions): Promise<FrameResult>;
}

/** Frames are analysed at this size, then boxes are mapped back to video pixels. */
const MAX_SIDE = 640;
const MAX_SIDE_RECOGNIZE = 960;

function frameSize(video: HTMLVideoElement, recognize: boolean) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const limit = recognize ? MAX_SIDE_RECOGNIZE : MAX_SIDE;
  const scale = Math.min(1, limit / Math.max(vw, vh));
  return { w: Math.max(1, Math.round(vw * scale)), h: Math.max(1, Math.round(vh * scale)), inv: 1 / scale };
}

function rescale(result: FrameResult, inv: number): FrameResult {
  if (inv === 1) return result;
  const m = (b: [number, number, number, number]): [number, number, number, number] => [
    b[0] * inv,
    b[1] * inv,
    b[2] * inv,
    b[3] * inv,
  ];
  return {
    ms: result.ms,
    objects: result.objects.map((o) => ({ ...o, bbox: m(o.bbox) })),
    faces: result.faces.map((f) => ({ ...f, bbox: m(f.bbox) })),
  };
}

/* ======================================================= worker source */

export const WORKER_SRC = `
const RUNTIME = ${JSON.stringify(RUNTIME_URL)};
const FACE_MODELS = ${JSON.stringify(FACE_MODEL_URL)};
const COCO_URL = ${JSON.stringify(COCO_URL)};
const LABELS = ${JSON.stringify(COCO_LABELS)};

let faceapi = null, tf = null, coco = null, backend = "cpu";
const nets = new Set();
let chain = Promise.resolve();
const serial = (fn) => (chain = chain.then(fn, fn));

async function boot() {
  if (faceapi) return;
  faceapi = await import(RUNTIME);
  tf = faceapi.tf;
  // face-api needs a canvas environment; a worker has OffscreenCanvas instead of the DOM.
  faceapi.env.setEnv({
    Canvas: OffscreenCanvas,
    CanvasRenderingContext2D: self.OffscreenCanvasRenderingContext2D,
    Image: class {},
    ImageData: self.ImageData,
    Video: class {},
    createCanvasElement: () => new OffscreenCanvas(1, 1),
    createImageElement: () => ({}),
    createVideoElement: () => ({}),
    fetch: (...a) => fetch(...a),
    readFile: () => { throw new Error("no filesystem"); },
  });
  try {
    if (!(await tf.setBackend("webgl"))) throw new Error("webgl unavailable");
    backend = "webgl";
  } catch {
    await tf.setBackend("cpu");
    backend = "cpu";
  }
  await tf.ready();
}

async function ensure(want) {
  await boot();
  const jobs = [];
  if (want.objects && !coco) {
    jobs.push(tf.loadGraphModel(COCO_URL).then(async (m) => {
      const z = tf.zeros([1, 300, 300, 3], "int32");
      const r = await m.executeAsync(z);
      await Promise.all(r.map((t) => t.data()));
      r.forEach((t) => t.dispose()); z.dispose();
      coco = m;
    }));
  }
  const need = [];
  if (want.faces || want.recognize) need.push("tinyFaceDetector");
  if (want.recognize) need.push("faceLandmark68Net", "faceRecognitionNet");
  for (const n of need) {
    if (!nets.has(n)) jobs.push(faceapi.nets[n].loadFromUri(FACE_MODELS).then(() => nets.add(n)));
  }
  await Promise.all(jobs);
}

async function objects(img, minScore) {
  const batched = tf.expandDims(img);
  const h = img.shape[0], w = img.shape[1];
  let out;
  try { out = await coco.executeAsync(batched); } finally { batched.dispose(); }
  const nB = out[0].shape[1], nC = out[0].shape[2];
  const [scores, boxes] = await Promise.all([out[0].data(), out[1].data()]);
  out.forEach((t) => t.dispose());
  const max = new Array(nB), cls = new Array(nB);
  for (let i = 0; i < nB; i++) {
    let m = Number.MIN_VALUE, k = -1;
    for (let j = 0; j < nC; j++) { const s = scores[i * nC + j]; if (s > m) { m = s; k = j; } }
    max[i] = m; cls[i] = k;
  }
  const bt = tf.tensor2d(boxes, [nB, 4]);
  const keep = await tf.image.nonMaxSuppressionAsync(bt, max, 25, minScore, minScore);
  const idx = await keep.data();
  bt.dispose(); keep.dispose();
  const res = [];
  for (const i of idx) {
    const label = LABELS[cls[i] + 1];
    if (!label) continue;
    const y0 = boxes[i * 4] * h, x0 = boxes[i * 4 + 1] * w, y1 = boxes[i * 4 + 2] * h, x1 = boxes[i * 4 + 3] * w;
    res.push({ label, score: max[i], bbox: [x0, y0, x1 - x0, y1 - y0] });
  }
  return res;
}

async function faces(img, recognize) {
  // 512 scores clear faces far more reliably (enrollment/naming); 416 is faster for plain boxes.
  const opt = new faceapi.TinyFaceDetectorOptions({ inputSize: recognize ? 512 : 416, scoreThreshold: 0.5 });
  if (recognize) {
    const r = await faceapi.detectAllFaces(img, opt).withFaceLandmarks().withFaceDescriptors();
    return r.map((f) => ({
      score: f.detection.score,
      bbox: [f.detection.box.x, f.detection.box.y, f.detection.box.width, f.detection.box.height],
      descriptor: Array.from(f.descriptor),
    }));
  }
  const r = await faceapi.detectAllFaces(img, opt);
  return r.map((f) => ({ score: f.score, bbox: [f.box.x, f.box.y, f.box.width, f.box.height] }));
}

async function detect({ bitmap, opts }) {
  const t0 = performance.now();
  await ensure(opts);
  const c = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const img = tf.browser.fromPixels(ctx.getImageData(0, 0, c.width, c.height));
  try {
    const [o, f] = await Promise.all([
      opts.objects ? objects(img, opts.confidence) : [],
      opts.faces || opts.recognize ? faces(img, opts.recognize) : [],
    ]);
    return { objects: o, faces: f, ms: performance.now() - t0 };
  } finally {
    img.dispose();
  }
}

self.onmessage = (e) => {
  const { id, type, payload } = e.data;
  const run = type === "ensure" ? () => ensure(payload).then(() => ({ backend }))
            : type === "detect" ? () => detect(payload)
            : () => Promise.reject(new Error("unknown request"));
  serial(run).then(
    (result) => self.postMessage({ id, ok: true, result }),
    (err) => self.postMessage({ id, ok: false, error: String((err && err.message) || err) }),
  );
};
`;

/* ======================================================= worker client */

function createWorkerEngine(): Promise<VisionEngine> {
  return new Promise((resolve, reject) => {
    if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
      reject(new Error("worker features unavailable"));
      return;
    }
    let worker: Worker;
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
    try {
      worker = new Worker(url, { type: "module" });
    } catch (e) {
      URL.revokeObjectURL(url);
      reject(e);
      return;
    }

    let seq = 0;
    const pending = new Map<number, { res: (v: unknown) => void; rej: (e: Error) => void }>();
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.res(e.data.result);
      else p.rej(new Error(e.data.error || "AI worker error"));
    };
    worker.onerror = (e) => {
      const err = new Error(e.message || "AI worker crashed");
      pending.forEach((p) => p.rej(err));
      pending.clear();
    };

    const call = <T,>(type: string, payload: unknown, transfer: Transferable[] = []) =>
      new Promise<T>((res, rej) => {
        const id = ++seq;
        pending.set(id, { res: res as (v: unknown) => void, rej });
        worker.postMessage({ id, type, payload }, transfer);
      });

    const engine: VisionEngine = {
      kind: "worker",
      backend: "webgl",
      async ensure(want) {
        const r = await call<{ backend: string }>("ensure", want);
        engine.backend = r.backend;
      },
      async detect(video, options) {
        const { w, h, inv } = frameSize(video, options.recognize);
        // Off-thread decode + resize; cross-origin (tainted) frames fail to transfer below.
        const bitmap = await createImageBitmap(video, { resizeWidth: w, resizeHeight: h, resizeQuality: "low" });
        try {
          const result = await call<FrameResult>("detect", { bitmap, opts: options }, [bitmap]);
          return rescale(result, inv);
        } catch (e) {
          bitmap.close?.();
          throw e;
        }
      },
    };

    // Boot the runtime in the worker; if it can't (old browser / blocked module import), fall back.
    call<{ backend: string }>("ensure", { objects: false, faces: false, recognize: false })
      .then((r) => {
        engine.backend = r.backend;
        resolve(engine);
      })
      .catch((e) => {
        worker.terminate();
        URL.revokeObjectURL(url);
        reject(e);
      });
  });
}

/* ================================================ main-thread fallback */

function createMainEngine(): VisionEngine {
  const scratch = document.createElement("canvas");
  const ctx = scratch.getContext("2d", { willReadFrequently: true })!;
  const yieldToVideo = () => new Promise<void>((r) => setTimeout(r, 0));

  const engine: VisionEngine = {
    kind: "main",
    backend: "webgl",
    async ensure(want) {
      const { api, backend } = await loadRuntime();
      engine.backend = backend;
      const jobs: Promise<unknown>[] = [];
      if (want.faces || want.recognize) jobs.push(loadFaceNet(api, "tinyFaceDetector"));
      if (want.recognize) {
        jobs.push(loadFaceNet(api, "faceLandmark68Net"), loadFaceNet(api, "faceRecognitionNet"));
      }
      await Promise.all(jobs);
    },
    async detect(video, options) {
      const t0 = performance.now();
      await engine.ensure(options);
      const { api } = await loadRuntime();
      const { w, h, inv } = frameSize(video, options.recognize);
      scratch.width = w;
      scratch.height = h;
      ctx.drawImage(video, 0, 0, w, h); // throws SecurityError later if the stream is cross-origin

      const objects = options.objects ? await detectObjectsFromTensorSource(scratch, options.confidence) : [];
      await yieldToVideo(); // let the video paint between passes

      let faces: RawFace[] = [];
      if (options.faces || options.recognize) {
        const opt = new api.TinyFaceDetectorOptions({ inputSize: options.recognize ? 512 : 416, scoreThreshold: 0.5 });
        if (options.recognize) {
          const r = await api.detectAllFaces(scratch, opt).withFaceLandmarks().withFaceDescriptors();
          faces = r.map((f) => ({
            score: f.detection.score,
            bbox: [f.detection.box.x, f.detection.box.y, f.detection.box.width, f.detection.box.height],
            descriptor: Array.from(f.descriptor),
          }));
        } else {
          const r = await api.detectAllFaces(scratch, opt);
          faces = r.map((f) => ({ score: f.score, bbox: [f.box.x, f.box.y, f.box.width, f.box.height] }));
        }
      }
      return rescale({ objects, faces, ms: performance.now() - t0 }, inv);
    },
  };
  return engine;
}

/* ============================================================== public */

let enginePromise: Promise<VisionEngine> | null = null;

/** One shared engine per page. Prefers the background worker; falls back gracefully. */
export function getVisionEngine(): Promise<VisionEngine> {
  if (!enginePromise) {
    enginePromise = createWorkerEngine().catch(() => createMainEngine());
  }
  return enginePromise;
}

export function isSecurityError(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /security|taint|cross.origin|origin-clean|DataCloneError|could not be cloned|insecure/i.test(msg);
}
