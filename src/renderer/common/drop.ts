import Case from "case";

export function encodeFilePath(path: string) {
  return `file://${encodeURIComponent(path)
    .replace(/(%2F)|(%5C)/g, "/")
    .replace(/%3A/g, ":")}`;
}

export function getDropURL(dataTransfer: DataTransfer): string | undefined {
  const files: FileList = dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    const path = window.player.getPathForFile(file);
    if (path) {
      return encodeFilePath(path);
    }
  }
}

export function cleanFileName(name: string): string {
  // Remove file extension
  let clean = name.substring(0, name.lastIndexOf(".")) || name;
  // Clean string
  clean = clean.replace(/ +/g, " ");
  clean = clean.trim();
  // Capitalize and remove underscores
  clean = Case.capital(clean);

  return clean;
}
