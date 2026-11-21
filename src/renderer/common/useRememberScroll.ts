import React, { useLayoutEffect } from "react";

// Scroll positions by key, kept for as long as the app is open.
const positions = new Map<string, number>();

/**
 * Remember how far a list was scrolled, and put it back when the list is shown again
 * (e.g. after opening a playlist and pressing back).
 */
export function useRememberScroll(
  ref: React.MutableRefObject<HTMLElement>,
  key: string
) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const saved = positions.get(key);
    if (saved) {
      element.scrollTop = saved;
    }
    // The grid can finish laying out after the first paint, so try once more on the next frame
    const frame = requestAnimationFrame(() => {
      if (saved && element.scrollTop !== saved) {
        element.scrollTop = saved;
      }
    });

    function handleScroll() {
      positions.set(key, element.scrollTop);
    }
    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("scroll", handleScroll);
    };
  }, [key]);
}
