/**
 * Single on-demand AI runtime.
 *
 * Previously TensorFlow.js, COCO-SSD, MediaPipe and face-api were all bundled into
 * the page (≈2.8 MB of JavaScript parsed on every visit). Now nothing ML-related
 * ships with the app: the first time someone starts AI Vision we fetch ONE
 * self-contained ES module (face-api, which embeds a full TensorFlow.js build)
 * from jsDelivr, and reuse its TensorFlow instance for object detection too.
 * The browser caches it, so later scans start instantly.
 */
import type * as FaceApiTypes from "@vladmandic/face-api";

const RUNTIME_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.esm.js";
export const FACE_MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";

/** The bundled d.ts only exposes a subset of TF; these are the extra runtime APIs we use. */
export interface TensorLike {
  shape: number[];
  data(): Promise<Float32Array | Int32Array | Uint8Array>;
  dispose(): void;
}
export interface GraphModel {
  executeAsync(input: TensorLike): Promise<TensorLike[]>;
}
export interface TfRuntime {
  setBackend(name: string): Promise<boolean>;
  getBackend(): string;
  ready(): Promise<void>;
  loadGraphModel(url: string): Promise<GraphModel>;
  tidy<T>(fn: () => T): T;
  browser: { fromPixels(el: HTMLVideoElement | HTMLCanvasElement): TensorLike };
  expandDims(t: TensorLike): TensorLike;
  zeros(shape: number[], dtype?: string): TensorLike;
  tensor2d(values: ArrayLike<number>, shape: [number, number]): TensorLike;
  image: {
    nonMaxSuppressionAsync(
      boxes: TensorLike,
      scores: number[],
      maxOut: number,
      iou?: number,
      minScore?: number,
    ): Promise<TensorLike>;
  };
}

export type FaceApi = typeof FaceApiTypes & { tf: TfRuntime };

let runtime: Promise<{ api: FaceApi; backend: string }> | null = null;

export function loadRuntime(): Promise<{ api: FaceApi; backend: string }> {
  if (!runtime) {
    runtime = (async () => {
      const api = (await import(/* @vite-ignore */ RUNTIME_URL)) as FaceApi;
      let backend = "webgl";
      try {
        if (!(await api.tf.setBackend("webgl"))) throw new Error("no webgl");
      } catch {
        backend = "cpu";
        await api.tf.setBackend("cpu");
      }
      await api.tf.ready();
      return { api, backend };
    })().catch((error: unknown) => {
      runtime = null;
      throw error instanceof Error
        ? error
        : new Error("Could not download the AI runtime. Check your connection and try again.");
    });
  }
  return runtime;
}

const loadedNets = new Map<string, Promise<void>>();

/** Load a face-api network once (tinyFaceDetector, faceLandmark68Net, faceRecognitionNet). */
export function loadFaceNet(api: FaceApi, name: "tinyFaceDetector" | "faceLandmark68Net" | "faceRecognitionNet") {
  let p = loadedNets.get(name);
  if (!p) {
    p = api.nets[name].loadFromUri(FACE_MODEL_URL).catch((e: unknown) => {
      loadedNets.delete(name);
      throw e;
    });
    loadedNets.set(name, p);
  }
  return p;
}
