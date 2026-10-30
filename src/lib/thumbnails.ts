import type { Item, Medium } from "@/types";
import { hashString, youtubeId } from "@/lib/catalog";

/**
 * Curated high-resolution stock photography matching broadcasting categories.
 * Each category has multiple photos so sibling channels in the same genre
 * don't look identical.
 */
export const CATEGORY_PHOTOS: Record<string, string[]> = {
  // TV Genres
  news: [
    "https://images.pexels.com/photos/7865064/pexels-photo-7865064.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/10464786/pexels-photo-10464786.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/39332193/pexels-photo-39332193.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/33925166/pexels-photo-33925166.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  "top-news": [
    "https://images.pexels.com/photos/33925166/pexels-photo-33925166.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/10464786/pexels-photo-10464786.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/7865064/pexels-photo-7865064.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  sports: [
    "https://images.pexels.com/photos/35898730/pexels-photo-35898730.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/28827841/pexels-photo-28827841.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/4122451/pexels-photo-4122451.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/38153899/pexels-photo-38153899.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  movies: [
    "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/7991139/pexels-photo-7991139.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/7991266/pexels-photo-7991266.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/7513412/pexels-photo-7513412.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  music: [
    "https://images.pexels.com/photos/13230484/pexels-photo-13230484.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/4218027/pexels-photo-4218027.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/30215324/pexels-photo-30215324.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  entertainment: [
    "https://images.pexels.com/photos/13230484/pexels-photo-13230484.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/7513412/pexels-photo-7513412.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  documentary: [
    "https://images.pexels.com/photos/26999484/pexels-photo-26999484.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/17475456/pexels-photo-17475456.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  kids: [
    "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  animation: [
    "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  science: [
    "https://images.pexels.com/photos/39332193/pexels-photo-39332193.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  travel: [
    "https://images.pexels.com/photos/2598042/pexels-photo-2598042.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/17475456/pexels-photo-17475456.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  weather: [
    "https://images.pexels.com/photos/5007010/pexels-photo-5007010.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/27197230/pexels-photo-27197230.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],

  // Webcam Genres
  beach: [
    "https://images.pexels.com/photos/2598042/pexels-photo-2598042.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/27197230/pexels-photo-27197230.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/5007010/pexels-photo-5007010.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  city: [
    "https://images.pexels.com/photos/9410009/pexels-photo-9410009.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/20101853/pexels-photo-20101853.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/34947070/pexels-photo-34947070.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  mountain: [
    "https://images.pexels.com/photos/17475456/pexels-photo-17475456.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/36183772/pexels-photo-36183772.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  animals: [
    "https://images.pexels.com/photos/26999484/pexels-photo-26999484.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/35994684/pexels-photo-35994684.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  nature: [
    "https://images.pexels.com/photos/5007010/pexels-photo-5007010.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/17475456/pexels-photo-17475456.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  space: [
    "https://images.pexels.com/photos/9410009/pexels-photo-9410009.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/20101853/pexels-photo-20101853.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],

  // Radio Genres
  radio: [
    "https://images.pexels.com/photos/26280294/pexels-photo-26280294.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/12972784/pexels-photo-12972784.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/11449473/pexels-photo-11449473.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  hits: [
    "https://images.pexels.com/photos/13230484/pexels-photo-13230484.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
    "https://images.pexels.com/photos/4218027/pexels-photo-4218027.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  rock: [
    "https://images.pexels.com/photos/30215324/pexels-photo-30215324.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  jazz: [
    "https://images.pexels.com/photos/26280294/pexels-photo-26280294.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
  chill: [
    "https://images.pexels.com/photos/2598042/pexels-photo-2598042.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  ],
};

const DEFAULT_POOL = [
  "https://images.pexels.com/photos/33925166/pexels-photo-33925166.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  "https://images.pexels.com/photos/7991139/pexels-photo-7991139.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  "https://images.pexels.com/photos/35898730/pexels-photo-35898730.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  "https://images.pexels.com/photos/13230484/pexels-photo-13230484.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  "https://images.pexels.com/photos/9410009/pexels-photo-9410009.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  "https://images.pexels.com/photos/2598042/pexels-photo-2598042.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
  "https://images.pexels.com/photos/26280294/pexels-photo-26280294.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=450&w=800",
];

/**
 * Extract YouTube live broadcast thumbnail if available.
 */
export function getYoutubeThumbnail(item: Item, big = false): string | null {
  const yt = item.sources?.youtube?.[0];
  if (!yt) return null;
  const id = youtubeId(yt);
  if (!id) return null;
  // mqdefault is a true 16:9 320×180 frame (~8 KB) — ideal for cards; hq only for large art.
  return `https://i.ytimg.com/vi/${id}/${big ? "hq720" : "mqdefault"}.jpg`;
}

/**
 * Determine the best genre key from channel name keywords.
 */
function inferGenre(name: string, medium?: Medium): string | null {
  const n = name.toLowerCase();
  if (medium === "radio") {
    if (/rock|metal/.test(n)) return "rock";
    if (/jazz|blues/.test(n)) return "jazz";
    if (/chill|ambient|relax/.test(n)) return "chill";
    if (/news|talk|info/.test(n)) return "news";
    return "radio";
  }
  if (medium === "webcams") {
    if (/beach|sea|surf|ocean|bay|coast/.test(n)) return "beach";
    if (/city|square|street|skyline|town|tower/.test(n)) return "city";
    if (/mountain|peak|alps|snow|ski|pass/.test(n)) return "mountain";
    if (/animal|zoo|safari|bird|nest|feed/.test(n)) return "animals";
    if (/space|earth|nasa|sky|aurora|iss/.test(n)) return "space";
    return "nature";
  }
  if (/sport|football|soccer|cricket|tennis|golf|racing|espn/.test(n)) return "sports";
  if (/movie|cinema|film|hollywood|action|drama/.test(n)) return "movies";
  if (/news|bbc|cnn|info|24|press|bulletin|al jazeera/.test(n)) return "news";
  if (/music|hit|pop|rock|dance|mtv|viva|sound/.test(n)) return "music";
  if (/kid|cartoon|toon|child|junior|disney|nick/.test(n)) return "kids";
  if (/anime|anim/.test(n)) return "animation";
  if (/weather|meteo|climate/.test(n)) return "weather";
  if (/nature|wild|planet|earth|geo|docu/.test(n)) return "documentary";
  return null;
}

/**
 * Resolve a photographic background image for any item.
 */
export function getPhotoThumbnail(
  item: Item,
  medium?: Medium,
  categoryHint?: string,
  width = 400,
): string {
  const genre = categoryHint ?? inferGenre(item.name, medium);
  const pool = (genre && CATEGORY_PHOTOS[genre]) || DEFAULT_POOL;
  const h = hashString(item.nanoid + item.name);
  return sizePhoto(pool[h % pool.length], width);
}

/** Request a photo at the size it's displayed (cards ≈400px, hero ≈1280px) instead of a fixed 800px. */
export function sizePhoto(url: string, width: number): string {
  const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const w = Math.round(width * dpr);
  const hgt = Math.round((w * 9) / 16);
  return url.replace(/([?&])h=\d+/, `$1h=${hgt}`).replace(/([?&])w=\d+/, `$1w=${w}`);
}
