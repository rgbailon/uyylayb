import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { hashString } from "@/lib/catalog";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PALETTES: [string, string, string][] = [
  ["#ff2e63", "#7f1d4a", "#2a0f1f"],
  ["#8b5cf6", "#4c1d95", "#190f2e"],
  ["#06b6d4", "#0e7490", "#07262e"],
  ["#f59e0b", "#b45309", "#2b1a06"],
  ["#10b981", "#065f46", "#06241b"],
  ["#3b82f6", "#1e40af", "#0a1733"],
  ["#ec4899", "#9d174d", "#2b0a1c"],
  ["#f43f5e", "#9f1239", "#2c0812"],
  ["#14b8a6", "#0f766e", "#06231f"],
  ["#a3e635", "#4d7c0f", "#18260a"],
  ["#fb7185", "#be123c", "#2c0a13"],
  ["#60a5fa", "#1d4ed8", "#0b1430"],
];

export function artFor(seed: string) {
  const h = hashString(seed);
  const [a, b, c] = PALETTES[h % PALETTES.length];
  const angle = 100 + (h % 7) * 20;
  const x = 20 + (h % 50);
  const y = 15 + ((h >> 3) % 55);
  return {
    accent: a,
    background: `radial-gradient(120% 110% at ${x}% ${y}%, ${a}44 0%, ${b}66 42%, ${c} 100%), linear-gradient(${angle}deg, ${c} 0%, ${b}99 100%)`,
  };
}

export function initials(name: string): string {
  const cleaned = name.replace(/[^\p{L}\p{N} ]/gu, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function formatClock(tz: string, date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    }).format(date);
  } catch {
    return "--:--";
  }
}

export function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

const QUALITY_SUFFIX = /(uhd|fhd|hd|sd|4k|1080p?|720p?|480p?)$/;

export function loosenName(name: string): string {
  let n = normalizeName(name);
  for (let i = 0; i < 2; i++) n = n.replace(QUALITY_SUFFIX, "");
  return n;
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function fmtBitrate(bps: number): string {
  if (!bps || !Number.isFinite(bps)) return "—";
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  return `${Math.round(bps / 1000)} kbps`;
}
