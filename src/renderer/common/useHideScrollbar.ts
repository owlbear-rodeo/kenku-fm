import React, { useEffect } from "react";

export function useHideScrollbar(ref: React.MutableRefObject<HTMLDivElement>) {
  function handlePointerLeave() {
    const container = ref.current;
    if (container) {
      container.classList.add("hide-scrollbar");
    }
  }

  // Check for pointer over on move to work around issue of pointer being over the component on mount
  function handlePointerMove() {
    const container = ref.current;
    if (container && container.classList.contains("hide-scrollbar")) {
      container.classList.remove("hide-scrollbar");
    }
  }

  useEffect(() => {
    const container = ref.current;
    if (container) {
      container.classList.add("hide-scrollbar");
    }
  }, []);

  return {
    onPointerLeave: handlePointerLeave,
    onPointerMove: handlePointerMove,
  };
}
