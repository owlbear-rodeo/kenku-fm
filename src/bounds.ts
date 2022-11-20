import { BrowserWindow, Rectangle, screen } from "electron";
import Store from "electron-store";

const store = new Store<{
  bounds: Rectangle;
}>();

export function getSavedBounds(): Partial<Rectangle> {
  const bounds = store.get("bounds");
  const savedBounds: Partial<Rectangle> = {};
  if (bounds) {
    const area = screen.getDisplayMatching(bounds).workArea;
    // If the saved position still valid (the window is entirely inside the display area), use it.
    if (
      bounds.x >= area.x &&
      bounds.y >= area.y &&
      bounds.x + bounds.width <= area.x + area.width &&
      bounds.y + bounds.height <= area.y + area.height
    ) {
      savedBounds.x = bounds.x;
      savedBounds.y = bounds.y;
    }
    // If the saved size is still valid, use it.
    if (bounds.width <= area.width || bounds.height <= area.height) {
      savedBounds.width = bounds.width;
      savedBounds.height = bounds.height;
    }
  }
  return savedBounds;
}

export function saveWindowBounds(window: BrowserWindow) {
  let timeoutRef: NodeJS.Timeout | undefined = undefined;
  window.on("resize", handleResizeOrMove);
  window.on("move", handleResizeOrMove);
  function handleResizeOrMove() {
    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }
    timeoutRef = setTimeout(() => {
      timeoutRef = undefined;
      store.set("bounds", window.getNormalBounds());
    }, 1000);
  }
}
