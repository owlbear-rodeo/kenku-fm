export function getDropURL(dataTransfer: DataTransfer): string | undefined {
  const files = Array.from(dataTransfer.files);
  if (files.length > 0) {
    const file = files[0];
    const path = (file as any).path;
    if (path) {
      return `file://${encodeURI(path)}`;
    }
  }
}
