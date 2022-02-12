import { useState } from "react";
import { v4 as uuid } from "uuid";

import { cleanFileName, encodeFilePath } from "../../renderer/common/drop";

export interface AudioFile {
  id: string;
  url: string;
  title: string;
}

const supportedFileTypes = [
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
];

function isFileSystemFileEntry(
  entry: FileSystemEntry
): entry is FileSystemFileEntry {
  return entry.isFile;
}

function isFileSystemDirectoryEntry(
  entry: FileSystemEntry
): entry is FileSystemDirectoryEntry {
  return entry.isDirectory;
}

export type Directory = {
  path: string;
  name: string;
  audioFiles: AudioFile[];
};

export type Directories = Record<string, Directory>;

async function getFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

async function getEntries(
  entry: FileSystemDirectoryEntry
): Promise<FileSystemEntry[]> {
  const dirReader = entry.createReader();
  return new Promise((resolve, reject) => {
    dirReader.readEntries(resolve, reject);
  });
}

async function getDirectories(
  entries: FileSystemEntry[],
  path: string = "/",
  directories: Directories = {
    "/": { path: "/", name: "root", audioFiles: [] },
  }
): Promise<Directories> {
  for (let entry of entries) {
    if (isFileSystemFileEntry(entry)) {
      const file = await getFile(entry);
      if (path in directories && supportedFileTypes.includes(file.type)) {
        directories[path].audioFiles.push({
          url: encodeFilePath(file.path),
          title: cleanFileName(file.name),
          id: uuid(),
        });
      }
    } else if (isFileSystemDirectoryEntry(entry)) {
      const folderPath = path + entry.name;
      directories[folderPath] = {
        path: folderPath,
        name: entry.name,
        audioFiles: [],
      };
      const folderEntries = await getEntries(entry);
      await getDirectories(folderEntries, folderPath, directories);
    }
  }
  return directories;
}

export function useDrop(onDrop: (directories: Directories) => void) {
  const [dragging, setDragging] = useState(false);
  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const entries = Array.from(event.dataTransfer.items).map((item) =>
      item.webkitGetAsEntry()
    );
    const directories = await getDirectories(entries);
    onDrop(directories);
    setDragging(false);
  }

  const containerListeners = {
    onDragEnter: handleDragEnter,
  };
  const overlayListeners = {
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  };

  return { dragging, containerListeners, overlayListeners };
}
