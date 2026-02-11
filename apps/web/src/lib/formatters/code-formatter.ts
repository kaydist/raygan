export function formatCodeBlock(code: string, language: string): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

export function truncateCode(code: string, maxLines: number = 10): string {
  const lines = code.split("\n");
  if (lines.length <= maxLines) return code;

  const truncated = lines.slice(0, maxLines).join("\n");
  return `${truncated}\n... (${lines.length - maxLines} more lines)`;
}

export function highlightDiff(
  oldCode: string,
  newCode: string
): { added: string[]; removed: string[] } {
  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const added = newLines.filter((line) => !oldSet.has(line));
  const removed = oldLines.filter((line) => !newSet.has(line));

  return { added, removed };
}

export function countLines(code: string): number {
  return code.split("\n").length;
}

export function countCharacters(code: string): number {
  return code.length;
}
