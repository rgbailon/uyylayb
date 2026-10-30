import { useRef, type TouchEvent } from "react";

interface SwipeHandlers {
  onLeft?: () => void;
  onRight?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onTap?: () => void;
}

/**
 * Touch swipe detection: a quick, mostly-horizontal flick fires left/right,
 * a mostly-vertical one fires up/down, and a near-stationary touch is a tap.
 */
export function useSwipe({ onLeft, onRight, onUp, onDown, onTap }: SwipeHandlers) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  return {
    onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) {
        start.current = null;
        return;
      }
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    },
    onTouchEnd(e: TouchEvent) {
      const s = start.current;
      start.current = null;
      if (!s || e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      const dt = Date.now() - s.t;

      if (ax < 10 && ay < 10 && dt < 350) {
        onTap?.();
        return;
      }
      if (dt > 700) return;
      if (ax > 45 && ax > ay * 1.4) {
        if (dx < 0) onLeft?.();
        else onRight?.();
      } else if (ay > 60 && ay > ax * 1.5) {
        if (dy < 0) onUp?.();
        else onDown?.();
      }
    },
    onTouchCancel() {
      start.current = null;
    },
  };
}
