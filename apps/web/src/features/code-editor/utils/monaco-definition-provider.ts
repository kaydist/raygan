import type { Monaco } from "@monaco-editor/react";
import type { languages, editor, Position, CancellationToken } from "monaco-editor";

type ITextModel = editor.ITextModel;
type Location = languages.Location;

interface ImportMatch {
  modulePath: string;
  isRelative: boolean;
}

function parseImportStatement(line: string): ImportMatch | null {
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/;
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/;
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/;

  let match = line.match(importRegex);
  if (!match) match = line.match(requireRegex);
  if (!match) match = line.match(dynamicImportRegex);

  if (match && match[1]) {
    const modulePath = match[1];
    const isRelative = modulePath.startsWith("./") || modulePath.startsWith("../");
    return { modulePath, isRelative };
  }

  return null;
}

function resolveModulePath(
  currentFilePath: string,
  modulePath: string,
  availableFiles: string[],
): string | null {
  if (!modulePath.startsWith("./") && !modulePath.startsWith("../")) {
    return null;
  }

  const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf("/"));
  const parts = modulePath.split("/");
  let resolvedDir = currentDir;

  for (const part of parts.slice(0, -1)) {
    if (part === "..") {
      resolvedDir = resolvedDir.substring(0, resolvedDir.lastIndexOf("/"));
    } else if (part !== ".") {
      resolvedDir = resolvedDir ? `${resolvedDir}/${part}` : part;
    }
  }

  const fileName = parts[parts.length - 1];
  const basePath = resolvedDir ? `${resolvedDir}/${fileName}` : fileName;

  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];

  for (const ext of extensions) {
    const fullPath = basePath + ext;
    if (availableFiles.includes(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

function getWordRangeAtPosition(
  model: ITextModel,
  position: Position,
): { word: string; startColumn: number; endColumn: number } | null {
  const line = model.getLineContent(position.lineNumber);

  const stringRegex = /['"]([^'"]+)['"]/g;
  let match;

  while ((match = stringRegex.exec(line)) !== null) {
    const matchedWord = match[1];
    if (!matchedWord) continue;

    const startCol = match.index + 2;
    const endCol = match.index + match[0].length;

    if (position.column >= startCol && position.column <= endCol) {
      return {
        word: matchedWord,
        startColumn: startCol,
        endColumn: endCol - 1,
      };
    }
  }

  return null;
}

export function registerDefinitionProvider(
  monaco: Monaco,
  getProjectFiles: () => string[],
  onNavigateToFile: (filePath: string) => void,
): void {
  const languageIds = [
    "typescript",
    "typescriptreact",
    "javascript",
    "javascriptreact",
  ];

  languageIds.forEach((language) => {
    monaco.languages.registerDefinitionProvider(language, {
      provideDefinition(
        model: ITextModel,
        position: Position,
        _token: CancellationToken,
      ): languages.ProviderResult<Location | Location[]> {
        const line = model.getLineContent(position.lineNumber);
        const importMatch = parseImportStatement(line);

        if (!importMatch || !importMatch.isRelative) {
          return null;
        }

        const wordRange = getWordRangeAtPosition(model, position);
        if (!wordRange) {
          return null;
        }

        const currentFilePath = model.uri.path.replace(/^\//, "");
        const availableFiles = getProjectFiles();
        const resolvedPath = resolveModulePath(
          currentFilePath,
          importMatch.modulePath,
          availableFiles,
        );

        if (!resolvedPath) {
          return null;
        }

        const targetUri = monaco.Uri.parse(`file:///${resolvedPath}`);
        const targetModel = monaco.editor.getModel(targetUri);

        if (targetModel) {
          return {
            uri: targetUri,
            range: {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: 1,
            },
          };
        }

        onNavigateToFile(resolvedPath);

        return {
          uri: targetUri,
          range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
          },
        };
      },
    });
  });
}

export function registerSymbolDefinitionProvider(
  monaco: Monaco,
  getProjectFiles: () => Map<string, { content?: string }>,
): void {
  const languageIds = [
    "typescript",
    "typescriptreact",
    "javascript",
    "javascriptreact",
  ];

  languageIds.forEach((language) => {
    monaco.languages.registerDefinitionProvider(language, {
      provideDefinition(
        model: ITextModel,
        position: Position,
        _token: CancellationToken,
      ): languages.ProviderResult<Location | Location[]> {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const symbolName = word.word;
        const files = getProjectFiles();
        const definitions: Location[] = [];

        const exportPatterns = [
          new RegExp(`export\\s+(?:default\\s+)?(?:function|const|let|var|class|interface|type|enum)\\s+${symbolName}\\b`),
          new RegExp(`export\\s+\\{[^}]*\\b${symbolName}\\b[^}]*\\}`),
          new RegExp(`(?:function|const|let|var|class|interface|type|enum)\\s+${symbolName}\\b`),
        ];

        files.forEach((file, filePath) => {
          if (!file.content) return;

          const lines = file.content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;

            for (const pattern of exportPatterns) {
              if (pattern.test(line)) {
                const colMatch = line.indexOf(symbolName);
                if (colMatch !== -1) {
                  definitions.push({
                    uri: monaco.Uri.parse(`file:///${filePath}`),
                    range: {
                      startLineNumber: i + 1,
                      startColumn: colMatch + 1,
                      endLineNumber: i + 1,
                      endColumn: colMatch + symbolName.length + 1,
                    },
                  });
                  return;
                }
              }
            }
          }
        });

        return definitions.length > 0 ? definitions : null;
      },
    });
  });
}
