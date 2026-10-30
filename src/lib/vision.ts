import { loadRuntime, type GraphModel } from "@/lib/ml";

export interface VisionBox {
  kind: "object" | "face";
  label: string;
  score?: number;
  bbox: [number, number, number, number];
  /** True only when the face matched a consenting, enrolled person. */
  identified?: boolean;
}

/** COCO-SSD lite MobileNet v2 weights (same model @tensorflow-models/coco-ssd uses by default). */
export const COCO_URL = "https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json";

/** COCO dataset class ids → labels (ids skip numbers, matching the model's output). */
export const COCO_LABELS: Record<number, string> = {
  1: "person", 2: "bicycle", 3: "car", 4: "motorcycle", 5: "airplane", 6: "bus", 7: "train",
  8: "truck", 9: "boat", 10: "traffic light", 11: "fire hydrant", 13: "stop sign",
  14: "parking meter", 15: "bench", 16: "bird", 17: "cat", 18: "dog", 19: "horse", 20: "sheep",
  21: "cow", 22: "elephant", 23: "bear", 24: "zebra", 25: "giraffe", 27: "backpack",
  28: "umbrella", 31: "handbag", 32: "tie", 33: "suitcase", 34: "frisbee", 35: "skis",
  36: "snowboard", 37: "sports ball", 38: "kite", 39: "baseball bat", 40: "baseball glove",
  41: "skateboard", 42: "surfboard", 43: "tennis racket", 44: "bottle", 46: "wine glass",
  47: "cup", 48: "fork", 49: "knife", 50: "spoon", 51: "bowl", 52: "banana", 53: "apple",
  54: "sandwich", 55: "orange", 56: "broccoli", 57: "carrot", 58: "hot dog", 59: "pizza",
  60: "donut", 61: "cake", 62: "chair", 63: "couch", 64: "potted plant", 65: "bed",
  67: "dining table", 70: "toilet", 72: "tv", 73: "laptop", 74: "mouse", 75: "remote",
  76: "keyboard", 77: "cell phone", 78: "microwave", 79: "oven", 80: "toaster", 81: "sink",
  82: "refrigerator", 84: "book", 85: "clock", 86: "vase", 87: "scissors", 88: "teddy bear",
  89: "hair drier", 90: "toothbrush",
};

/* -------- main-thread fallback (used only when the background worker is unavailable) -------- */

let cocoPromise: Promise<GraphModel> | null = null;

function loadCoco(): Promise<GraphModel> {
  if (!cocoPromise) {
    cocoPromise = (async () => {
      const { api } = await loadRuntime();
      const model = await api.tf.loadGraphModel(COCO_URL);
      const zero = api.tf.zeros([1, 300, 300, 3], "int32");
      const warm = await model.executeAsync(zero);
      await Promise.all(warm.map((t) => t.data()));
      warm.forEach((t) => t.dispose());
      zero.dispose();
      return model;
    })().catch((e: unknown) => {
      cocoPromise = null;
      throw e;
    });
  }
  return cocoPromise;
}

/** Object detection on an already-downscaled canvas. */
export async function detectObjectsFromTensorSource(
  source: HTMLCanvasElement,
  minScore: number,
): Promise<{ label: string; score: number; bbox: [number, number, number, number] }[]> {
  const [{ api }, coco] = await Promise.all([loadRuntime(), loadCoco()]);
  const tf = api.tf;
  const batched = tf.tidy(() => tf.expandDims(tf.browser.fromPixels(source)));
  const height = batched.shape[1] ?? source.height;
  const width = batched.shape[2] ?? source.width;

  let result: Awaited<ReturnType<GraphModel["executeAsync"]>>;
  try {
    result = await coco.executeAsync(batched);
  } finally {
    batched.dispose();
  }

  const numBoxes = result[0].shape[1];
  const numClasses = result[0].shape[2];
  const [scores, boxes] = await Promise.all([result[0].data(), result[1].data()]);
  result.forEach((t) => t.dispose());

  const maxScores: number[] = new Array(numBoxes);
  const classes: number[] = new Array(numBoxes);
  for (let i = 0; i < numBoxes; i++) {
    let max = Number.MIN_VALUE;
    let index = -1;
    for (let j = 0; j < numClasses; j++) {
      const v = scores[i * numClasses + j];
      if (v > max) {
        max = v;
        index = j;
      }
    }
    maxScores[i] = max;
    classes[i] = index;
  }

  const boxTensor = tf.tensor2d(boxes, [numBoxes, 4]);
  const keep = await tf.image.nonMaxSuppressionAsync(boxTensor, maxScores, 25, minScore, minScore);
  const indexes = await keep.data();
  boxTensor.dispose();
  keep.dispose();

  const out: { label: string; score: number; bbox: [number, number, number, number] }[] = [];
  for (const idx of indexes) {
    const label = COCO_LABELS[classes[idx] + 1];
    if (!label) continue;
    const minY = boxes[idx * 4] * height;
    const minX = boxes[idx * 4 + 1] * width;
    const maxY = boxes[idx * 4 + 2] * height;
    const maxX = boxes[idx * 4 + 3] * width;
    out.push({ label, score: maxScores[idx], bbox: [minX, minY, maxX - minX, maxY - minY] });
  }
  return out;
}
