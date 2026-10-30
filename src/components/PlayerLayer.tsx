import { useEffect, useMemo } from "react";
import { useApp } from "@/store/app";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ChannelArt } from "@/components/ChannelArt";
import { flagEmoji, languageName } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { primaryKind, sourceCount } from "@/lib/catalog";
import { Lock } from "@/components/Icons";

export function PlayerLayer() {
  const { video, setVideoMode, closeVideo, switchChannel } = useApp();

  useEffect(() => {
    if (video?.mode === "theater") {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [video?.mode]);

  const upNext = useMemo(() => {
    if (!video) return [];
    return video.queue.filter((q) => q.nanoid !== video.item.nanoid).slice(0, 40);
  }, [video]);

  if (!video) return null;
  const theater = video.mode === "theater";

  return (
    <div
      className={cn(
        "fixed z-[70]",
        theater
          ? "inset-0 bg-black"
          : "bottom-4 right-4 w-[min(92vw,400px)] overflow-hidden rounded-2xl border border-white/12 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)]",
      )}
    >
      <div className={cn(theater ? "flex h-full w-full flex-col xl:flex-row" : "aspect-video w-full")}>
        <div className={cn("relative", theater ? "min-h-0 flex-1" : "h-full w-full")}>
          <VideoPlayer
            key={video.token}
            item={video.item}
            medium={video.medium}
            queue={video.queue}
            mode={video.mode}
            onClose={closeVideo}
            onToggleMode={() => setVideoMode(theater ? "mini" : "theater")}
            onSelect={(it) => switchChannel(it)}
          />
        </div>

        {theater && upNext.length > 0 && (
          <aside className="thin-scrollbar hidden w-[340px] shrink-0 overflow-y-auto border-l border-white/8 bg-ink-950 p-4 xl:block">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-white/80">
                Up next
              </h3>
              <span className="text-[10px] text-white/35">{upNext.length} channels</span>
            </div>
            <div className="space-y-1.5">
              {upNext.map((it) => (
                <button
                  key={it.nanoid}
                  type="button"
                  onClick={() => switchChannel(it)}
                  className="group flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-white/6"
                >
                  <ChannelArt item={it} medium={video.medium} className="h-12 w-[84px] shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white/90 group-hover:text-white">
                      {it.name}
                    </p>
                    <p className="flex items-center gap-1 truncate text-[10px] text-white/40">
                      <span>{flagEmoji(it.country)}</span>
                      {it.languages.slice(0, 1).map(languageName).join("") || it.country.toUpperCase()}
                      {it.isGeoBlocked && <Lock className="h-2.5 w-2.5 text-amber-400" />}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-white/6 px-1.5 py-0.5 font-mono text-[9px] text-white/45">
                    {primaryKind(it) === "youtube" ? "YT" : "HLS"}
                    {sourceCount(it) > 1 ? `×${sourceCount(it)}` : ""}
                  </span>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
