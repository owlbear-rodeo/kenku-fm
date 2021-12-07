import React, { useState } from "react";

export function useHideScrollbar() {
  const [className, setClassName] = useState<string | undefined>(
    "hide-scrollbar"
  );

  function handlePointerLeave() {
    setClassName("hide-scrollbar");
  }

  // Check for pointer over on move to work around issue of pointer being over the component on mount
  function handlePointerMove() {
    if (className === "hide-scrollbar") {
      setClassName(undefined);
    }
  }

  return {
    className: className,
    onPointerLeave: handlePointerLeave,
    onPointerMove: handlePointerMove,
  };
}
