import React, { useCallback, useRef, useState } from "react";

export type FileInfo = { path: string; name: string };

function useFileDrop({
  onDrop,
  multiple,
  accept,
}: {
  onDrop: (files: FileInfo[]) => void;
  multiple: React.HTMLProps<HTMLInputElement>["multiple"];
  accept: React.HTMLProps<HTMLInputElement>["accept"];
}) {
  const [isDragging, setIsDragging] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onDragEnter(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function onDragLeave(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.relatedTarget !== rootRef.current.parentElement) {
      return;
    }
    setIsDragging(false);
  }

  function onDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function onFileDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const eventFiles = event.dataTransfer.files;
    if (eventFiles) {
      onFiles(eventFiles);
    }
  }

  function onClick() {
    setIsDragging(false);
    const input = inputRef.current;
    if (input) {
      input.click();
    }
  }

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    onFiles(files);
    event.target.value = "";
  }

  function onFiles(fileList: FileList) {
    const files: FileInfo[] = [];
    const maxFiles = multiple ? fileList.length : Math.min(fileList.length, 1);
    for (let i = 0; i < maxFiles; i++) {
      const file = fileList[i];
      if (!checkAccept(file.type)) {
        continue;
      }
      const path = window.player.getPathForFile(file);
      const name = file.name;
      files.push({ path, name });
    }
    onDrop(files);
  }

  // TODO: Make this check better i.e. check for explicit accepted files but this works for now
  function checkAccept(type: string) {
    if (accept.endsWith("*")) {
      return type.startsWith(accept.slice(0, -1));
    } else {
      return type === accept;
    }
  }

  // Use ref callback to make TS happy
  const rootRefCallback = useCallback((node: HTMLElement | null) => {
    rootRef.current = node;
  }, []);

  const rootProps = {
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop: onFileDrop,
    onClick,
    ref: rootRefCallback,
  };

  const inputProps = {
    ref: inputRef,
    multiple,
    accept,
    style: {
      display: "none",
    },
    type: "file",
    onChange,
  };

  return { isDragging, rootProps, inputProps };
}

export default useFileDrop;
