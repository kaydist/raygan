export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function downloadUrl(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  downloadBlob(blob, filename);
}
