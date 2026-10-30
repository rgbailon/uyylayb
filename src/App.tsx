import { useCallback, useEffect, useMemo, useState } from "react";
import type { Item, Medium } from "@/types";
import { AppProvider, useApp } from "@/store/app";
import { useRoute } from "@/lib/router";
import { Header } from "@/components/Header";
import { Footer, ShortcutsOverlay, Toasts } from "@/components/Chrome";
import { DetailModal, type DetailTarget } from "@/components/DetailModal";
import { SearchPalette } from "@/components/SearchPalette";
import { PlayerLayer } from "@/components/PlayerLayer";
import { RadioDock } from "@/components/RadioDock";
import { Home } from "@/pages/Home";
import { Browse } from "@/pages/Browse";
import { Countries, CountryDetail } from "@/pages/Countries";
import { MyList } from "@/pages/MyList";
import { Watch } from "@/pages/Watch";
import { prefetchHls } from "@/lib/hls";

const MEDIUMS: Medium[] = ["tv", "radio", "webcams"];

function isMedium(v: string | undefined): v is Medium {
  return !!v && (MEDIUMS as string[]).includes(v);
}

function Ambient() {
  // Static radial gradients: same glow, zero blur filters and no per-frame repaint.
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-void"
      style={{
        backgroundImage:
          "radial-gradient(520px 520px at 8% 4%, rgba(229,20,80,0.16), transparent 70%)," +
          "radial-gradient(480px 480px at 96% 30%, rgba(139,92,246,0.12), transparent 70%)," +
          "radial-gradient(460px 460px at 40% 100%, rgba(6,182,212,0.07), transparent 70%)",
      }}
    />
  );
}

function Shell() {
  const route = useRoute();
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const { audio } = useApp();

  useEffect(() => prefetchHls(), []);

  const onInfo = useCallback(
    (item: Item, medium: Medium, queue: Item[]) => setDetail({ item, medium, queue }),
    [],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    setDetail(null);
  }, [route.path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "?" && !typing) {
        e.preventDefault();
        setHelpOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const page = useMemo(() => {
    const [a, b, c] = route.segments;

    if (!a) return <Home medium="tv" mixed onInfo={onInfo} />;
    if (isMedium(a) && !b) return <Home medium={a} onInfo={onInfo} />;
    if (a === "browse" && isMedium(b)) return <Browse medium={b} query={route.query} onInfo={onInfo} />;
    if (a === "browse") return <Browse medium="tv" query={route.query} onInfo={onInfo} />;
    if (a === "countries") return <Countries />;
    if (a === "country" && b) return <CountryDetail cc={b.toLowerCase()} onInfo={onInfo} />;
    if (a === "list") return <MyList onInfo={onInfo} />;
    if (a === "watch" && isMedium(b) && c) return <Watch medium={b} id={c} />;

    return (
      <div className="grid min-h-[70vh] place-items-center px-6 pt-24 text-center">
        <div className="space-y-3">
          <p className="font-display text-6xl font-black tracking-tighter text-white/15">404</p>
          <p className="text-sm text-white/45">This channel does not exist on our dial.</p>
          <a
            href="#/"
            className="inline-block rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-brand-500 hover:text-white"
          >
            Back to the guide
          </a>
        </div>
      </div>
    );
  }, [route.segments, route.query, onInfo]);

  return (
    <div className="relative min-h-screen">
      <Ambient />
      <Header onSearch={() => setSearchOpen(true)} />
      <main className={audio ? "pb-24" : undefined}>{page}</main>
      <Footer />
      <DetailModal target={detail} onClose={() => setDetail(null)} />
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ShortcutsOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <PlayerLayer />
      <RadioDock />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
