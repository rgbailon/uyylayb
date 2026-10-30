import { useCallback, useEffect, useState } from "react";

export interface Route {
  path: string;
  segments: string[];
  query: URLSearchParams;
  hash: string;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [pathPart, queryPart = ""] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  return {
    path,
    segments: path.split("/").filter(Boolean),
    query: new URLSearchParams(queryPart),
    hash: raw,
  };
}

const subscribers = new Set<() => void>();

function emit() {
  subscribers.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", emit);
  window.addEventListener("popstate", emit);
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const target = `#${to.startsWith("/") ? to : `/${to}`}`;
  if (window.location.hash === target) return;
  if (opts.replace) {
    window.history.replaceState(null, "", target);
    emit();
  } else {
    window.location.hash = target;
  }
}

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse());
  useEffect(() => {
    const fn = () => setRoute(parse());
    subscribers.add(fn);
    fn();
    return () => {
      subscribers.delete(fn);
    };
  }, []);
  return route;
}

export function useNavigate() {
  return useCallback((to: string, opts?: { replace?: boolean }) => navigate(to, opts), []);
}
