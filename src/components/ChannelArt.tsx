import { memo, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Item, Medium } from "@/types";
import { artFor, cn, initials } from "@/lib/utils";
import {
  getArtworkEnabled,
  getLogoVersion,
  lookupLogo,
  subscribeArtwork,
  subscribeLogos,
} from "@/lib/logos";
import { getPhotoThumbnail, getYoutubeThumbnail } from "@/lib/thumbnails";

/** Subscribes only to the logo index + artwork toggle — not the whole app context. */
export function useLogo(item: Item): string | null {
  const version = useSyncExternalStore(subscribeLogos, getLogoVersion);
  const enabled = useSyncExternalStore(subscribeArtwork, getArtworkEnabled);
  return useMemo(
    () => (enabled ? lookupLogo(item.name, item.country) : null),
    // version is a cache-buster: lookups change once the index finishes loading
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.name, item.country, enabled, version],
  );
}

interface Props {
  item: Item;
  medium?: Medium;
  category?: string;
  className?: string;
  big?: boolean;
}

/**
 * Lightweight thumbnail. Same look as before, but with no per-card blur, noise
 * filter, blend mode or backdrop-filter — those were creating hundreds of GPU
 * filter layers on the home page. Images are requested at display size and
 * decoded off the main thread.
 */
function ChannelArtInner({ item, medium, category, className, big }: Props) {
  const logo = useLogo(item);
  const [logoFailed, setLogoFailed] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const art = useMemo(() => artFor(item.nanoid + item.name), [item.nanoid, item.name]);
  const ytThumb = useMemo(() => getYoutubeThumbnail(item, big), [item, big]);
  const photoThumb = useMemo(
    () => getPhotoThumbnail(item, medium, category, big ? 960 : 400),
    [item, medium, category, big],
  );

  const [ytFailed, setYtFailed] = useState(false);

  useEffect(() => {
    setYtFailed(false);
    setPhotoFailed(false);
    setLoaded(false);
  }, [ytThumb, photoThumb]);

  useEffect(() => setLogoFailed(false), [logo]);

  const src = !ytFailed && ytThumb ? ytThumb : photoThumb;

  useEffect(() => setLoaded(false), [src]);

  const onPhotoError = () => {
    if (!ytFailed && ytThumb && photoThumb && photoThumb !== ytThumb) setYtFailed(true);
    else setPhotoFailed(true);
  };

  const showPhoto = Boolean(src && !photoFailed);
  const showLogo = Boolean(logo && !logoFailed);

  return (
    <div
      className={cn("relative isolate overflow-hidden bg-ink-900", className)}
      style={{ backgroundImage: art.background }}
    >
      {showPhoto && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority={big ? "high" : "auto"}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={onPhotoError}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out will-change-auto",
            loaded ? "opacity-90" : "opacity-0",
            "group-hover/card:scale-105 group-hover/top:scale-105",
          )}
        />
      )}

      <div className="absolute inset-0 grid place-items-center p-3">
        {showLogo ? (
          <div
            className={cn(
              "flex items-center justify-center rounded-xl",
              showPhoto
                ? "max-h-[60%] max-w-[70%] border border-white/10 bg-black/70 p-2"
                : "max-h-[70%] max-w-[80%] p-2",
              big && "max-h-[75%] max-w-[75%] p-3",
            )}
          >
            <img
              src={logo!}
              alt=""
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              draggable={false}
              onError={() => setLogoFailed(true)}
              className={cn("max-h-full max-w-full object-contain", big && "max-h-[90%]")}
            />
          </div>
        ) : !showPhoto ? (
          <span
            className={cn(
              "font-display font-black tracking-tighter text-white/90 [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]",
              big ? "text-6xl" : "text-3xl",
            )}
          >
            {initials(item.name)}
          </span>
        ) : (
          <span className="absolute bottom-2.5 left-2.5 flex h-6 min-w-6 items-center justify-center rounded-lg border border-white/10 bg-black/75 px-1.5 font-display text-[10px] font-black tracking-wider text-white">
            {initials(item.name)}
          </span>
        )}
      </div>

      {/* One gradient layer (was three) keeps titles readable. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
    </div>
  );
}

export const ChannelArt = memo(ChannelArtInner);




