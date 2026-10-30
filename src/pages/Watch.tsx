import { useEffect, useState } from "react";
import type { Medium } from "@/types";
import { fetchAll, findItem } from "@/lib/catalog";
import { navigate } from "@/lib/router";
import { useApp } from "@/store/app";
import { useLaunch } from "@/components/ChannelCard";

export function Watch({ medium, id }: { medium: Medium; id: string }) {
  const launch = useLaunch();
  const { pushToast } = useApp();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    findItem(medium, id)
      .then(async (item) => {
        if (!alive) return;
        if (!item) {
          setError("That stream is no longer in the catalogue.");
          return;
        }
        const all = await fetchAll(medium);
        const queue = all.filter((i) => i.country === item.country).slice(0, 40);
        launch(item, medium, queue.length > 1 ? queue : [item]);
        pushToast(`Now playing ${item.name}`, "success");
        navigate(`/${medium}`, { replace: true });
      })
      .catch(() => alive && setError("Could not reach the catalogue."));
    return () => {
      alive = false;
    };
  }, [medium, id, launch, pushToast]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-6 pt-24 text-center">
      {error ? (
        <div className="space-y-3">
          <p className="font-display text-xl font-bold text-white">{error}</p>
          <button
            type="button"
            onClick={() => navigate(`/${medium}`)}
            className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-brand-500 hover:text-white"
          >
            Browse {medium}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-brand-500" />
          <p className="text-sm text-white/45">Locating stream in the catalogue…</p>
        </div>
      )}
    </div>
  );
}
