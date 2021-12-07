import React, { useState } from "react";

export function useHideScrollbar() {
  const [className, setClassName] = useState<string | undefined>(
    "hide-scrollbar"
  );

  function handlePointerEnter(event: React.PointerEvent<HTMLDivElement>) {
    setClassName(undefined);
  }

  function handlePointerLeave(event: React.PointerEvent<HTMLDivElement>) {
    setClassName("hide-scrollbar");
  }

  return {
    className: className,
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
  };
}
