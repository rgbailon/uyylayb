/**
 * Consent-based, on-device face recognition.
 *
 * Only people who were enrolled in person through the live device camera (with an
 * explicit consent confirmation) can ever be named. Unknown faces are never named,
 * looked up, or sent anywhere. Descriptors (128 numbers, not images) live only in
 * this browser's localStorage and can be deleted at any time.
 */
import type { VisionBox } from "@/lib/vision";
import type { RawFace } from "@/lib/visionEngine";

const STORE_KEY = "uyylayb.knownFaces.v1";
export const MAX_PEOPLE = 20;
const MAX_SAMPLES = 5;

/** Euclidean distance below which a match is considered accurate (stricter than face-api's 0.6 default). */
export const MATCH_THRESHOLD = 0.45;
/** Minimum detector score and face size for enrollment samples. */
const ENROLL_MIN_SCORE = 0.8;
const ENROLL_MIN_SIZE = 90;
/** Minimum face size to attempt recognition — tiny/blurry faces stay "Unknown". */
const MATCH_MIN_SIZE = 60;

export interface KnownPerson {
  id: string;
  name: string;
  descriptors: number[][];
  consentAt: number;
}

/* ------------------------------------------------------------- storage */

export function readKnownPeople(): KnownPerson[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as KnownPerson[]) : [];
    return Array.isArray(parsed) ? parsed.filter((p) => p.name && p.descriptors?.length) : [];
  } catch {
    return [];
  }
}

export function writeKnownPeople(people: KnownPerson[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(people));
  } catch {
    /* storage full or blocked — recognition simply won't persist */
  }
}

/* ----------------------------------------------------------- enrollment */

export type EnrollResult =
  | { ok: true; descriptor: number[] }
  | { ok: false; reason: string };

/** Validate one frame's faces for enrollment: exactly one clear, large face. */
export function validateEnrollment(faces: RawFace[]): EnrollResult {
  if (faces.length === 0) return { ok: false, reason: "No face found. Face the camera in good light." };
  if (faces.length > 1) {
    return { ok: false, reason: "More than one face is visible. Only the person being enrolled should be in frame." };
  }
  const face = faces[0];
  if (face.score < ENROLL_MIN_SCORE) {
    return { ok: false, reason: "The face isn't clear enough. Move closer and hold still." };
  }
  if (face.bbox[2] < ENROLL_MIN_SIZE) {
    return { ok: false, reason: "The face is too small. Move closer to the camera." };
  }
  if (!face.descriptor) return { ok: false, reason: "Face features could not be read. Try again." };
  return { ok: true, descriptor: face.descriptor };
}

export function addSample(person: KnownPerson, descriptor: number[]): KnownPerson {
  return { ...person, descriptors: [...person.descriptors, descriptor].slice(-MAX_SAMPLES) };
}

export const SAMPLES_REQUIRED = 3;

/* ---------------------------------------------------------- recognition */

function distance(a: number[] | Float32Array, b: number[]): number {
  let sum = 0;
  for (let i = 0; i < b.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Label faces that match an enrolled person within the strict threshold.
 * Ambiguous matches (two people nearly equally close) and small faces stay unknown.
 */
export function matchFaces(faces: RawFace[], people: KnownPerson[]): VisionBox[] {
  return faces.map((face) => {
    const bbox = face.bbox;
    if (!face.descriptor || bbox[2] < MATCH_MIN_SIZE || people.length === 0) {
      return { kind: "face", label: "Unknown face", score: face.score, bbox };
    }
    const descriptor = face.descriptor;

    let best: { name: string; d: number } | null = null;
    let runnerUp = Infinity;
    for (const person of people) {
      const d = Math.min(...person.descriptors.map((desc) => distance(descriptor, desc)));
      if (!best || d < best.d) {
        if (best) runnerUp = Math.min(runnerUp, best.d);
        best = { name: person.name, d };
      } else {
        runnerUp = Math.min(runnerUp, d);
      }
    }

    const clearWinner = runnerUp - (best?.d ?? 0) > 0.06;
    if (best && best.d <= MATCH_THRESHOLD && clearWinner) {
      return {
        kind: "face",
        label: best.name,
        score: Math.max(0, Math.min(1, 1 - best.d)),
        bbox,
        identified: true,
      };
    }
    return { kind: "face", label: "Unknown face", score: face.score, bbox };
  });
}
