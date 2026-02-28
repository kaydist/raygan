import type { SnackFiles } from "snack-sdk";

import type { ProjectFile } from "../types";

const SUPPORTED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".json", ".md"];

const ASSET_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];

export function transformProjectFilesToSnack(files: ProjectFile[]): SnackFiles {
  const snackFiles: SnackFiles = {};
  const normalizedPaths = new Set(
    files.filter((f) => isSupportedCodeFile(f.path)).map((f) => normalizeFilePath(f.path))
  );

  for (const file of files) {
    const normalizedPath = normalizeFilePath(file.path);

    if (isAssetFile(file.path)) {
      snackFiles[normalizedPath] = {
        type: "ASSET",
        contents: file.content,
      };
    } else if (isSupportedCodeFile(file.path)) {
      snackFiles[normalizedPath] = {
        type: "CODE",
        contents: transformLocalImports(file.content, normalizedPath, normalizedPaths),
      };
    }
  }

  injectEntryShim(snackFiles);
  return snackFiles;
}

export function transformFileTreeToSnack(
  fileTree: Record<string, string>
): SnackFiles {
  const snackFiles: SnackFiles = {};
  const normalizedPaths = Object.keys(fileTree).map(normalizeFilePath);
  const filePaths = new Set(normalizedPaths);

  for (const [path, content] of Object.entries(fileTree)) {
    const normalizedPath = normalizeFilePath(path);

    if (isAssetFile(path)) {
      snackFiles[normalizedPath] = {
        type: "ASSET",
        contents: content,
      };
    } else if (isSupportedCodeFile(path)) {
      const transformedContent = transformLocalImports(content, normalizedPath, filePaths);
      snackFiles[normalizedPath] = {
        type: "CODE",
        contents: transformedContent,
      };
    }
  }

  injectEntryShim(snackFiles);
  return snackFiles;
}

function injectEntryShim(snackFiles: SnackFiles): void {
  if (snackFiles["App.tsx"] || snackFiles["App.js"]) return;

  const entryPath = detectEntryPath(snackFiles);
  if (!entryPath) return;

  snackFiles["App.tsx"] = {
    type: "CODE",
    contents: `export { default } from "./${entryPath}";\n`,
  };
}

function detectEntryPath(snackFiles: SnackFiles): string | null {
  const candidates = [
    "app/_layout",
    "app/index",
    "src/app/_layout",
    "src/app/index",
    "index",
  ];

  const extensions = [".tsx", ".ts", ".jsx", ".js"];

  for (const candidate of candidates) {
    for (const ext of extensions) {
      if (`${candidate}${ext}` in snackFiles) {
        return candidate;
      }
    }
  }

  const screenFiles = Object.keys(snackFiles).filter(
    (p) => p.startsWith("screens/") && extensions.some((ext) => p.endsWith(ext))
  );
  if (screenFiles.length === 1) {
    return screenFiles[0]!.replace(/\.(tsx|ts|jsx|js)$/, "");
  }

  return null;
}

export function normalizeFilePath(path: string): string {
  let normalized = path.startsWith("/") ? path.slice(1) : path;
  normalized = normalized.startsWith("src/") ? normalized.slice(4) : normalized;
  return normalized;
}

export function isSupportedCodeFile(path: string): boolean {
  return SUPPORTED_EXTENSIONS.some((ext) => path.endsWith(ext));
}

export function isAssetFile(path: string): boolean {
  return ASSET_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));
}

export function extractDependenciesFromCode(
  code: string
): Record<string, string> {
  const dependencies: Record<string, string> = {};

  const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"./][^'"]*)['"]/g;
  const requireRegex = /require\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\)/g;

  let match;

  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1];
    if (importPath) {
      const packageName = getPackageName(importPath);
      if (packageName && !isBuiltInModule(packageName)) {
        dependencies[packageName] = "*";
      }
    }
  }

  while ((match = requireRegex.exec(code)) !== null) {
    const importPath = match[1];
    if (importPath) {
      const packageName = getPackageName(importPath);
      if (packageName && !isBuiltInModule(packageName)) {
        dependencies[packageName] = "*";
      }
    }
  }

  return dependencies;
}

function getPackageName(importPath: string): string {
  if (importPath.startsWith("@/") || importPath.startsWith("src/")) {
    return "";
  }
  if (importPath.startsWith("@")) {
    const parts = importPath.split("/");
    return parts.slice(0, 2).join("/") || importPath;
  }
  return importPath.split("/")[0] || importPath;
}

const BUILT_IN_MODULES = new Set([
  "react",
  "react-native",
  "expo",
]);

function isBuiltInModule(moduleName: string): boolean {
  return BUILT_IN_MODULES.has(moduleName);
}

function stripFileExtension(importPath: string): string {
  return importPath.replace(/\.(ts|tsx|js|jsx)$/, "");
}

function computeRelativePath(fromDir: string, toPath: string): string {
  if (!fromDir) return `./${toPath}`;

  const fromParts = fromDir.split("/");
  const toParts = toPath.split("/");

  let common = 0;
  while (
    common < fromParts.length &&
    common < toParts.length &&
    fromParts[common] === toParts[common]
  ) {
    common++;
  }

  const ups = fromParts.length - common;
  const remainder = toParts.slice(common).join("/");

  return ups === 0 ? `./${remainder}` : `${"../".repeat(ups)}${remainder}`;
}

function transformLocalImports(code: string, currentFilePath: string, projectFilePaths: Set<string>): string {
  const importRegex = /(import\s+(?:[\w\s{},*]+\s+from\s+)?['"])([^'"]+)(['"])/g;
  const requireRegex = /(require\s*\(\s*['"])([^'"]+)(['"]\s*\))/g;

  const currentDir = currentFilePath.includes("/")
    ? currentFilePath.substring(0, currentFilePath.lastIndexOf("/"))
    : "";

  const resolveImportPath = (importPath: string): string | null => {
    let normalized = importPath;

    if (normalized.startsWith("@/")) {
      normalized = normalized.slice(2);
      return computeRelativePath(currentDir, stripFileExtension(normalized));
    }

    if (normalized.startsWith("src/")) {
      normalized = normalized.slice(4);
      return computeRelativePath(currentDir, stripFileExtension(normalized));
    }

    const hasRelativePrefix = normalized.startsWith("./") || normalized.startsWith("../");
    if (hasRelativePrefix) {
      const stripped = stripFileExtension(normalized);
      return stripped !== normalized ? stripped : null;
    }

    const hasAbsolutePrefix = normalized.startsWith("/");
    let basePath = normalized;
    if (hasAbsolutePrefix) {
      basePath = normalized.slice(1);
    }

    basePath = stripFileExtension(basePath);

    if (projectFilePaths.has(basePath)) {
      return `./${basePath}`;
    }

    const extensions = [".ts", ".tsx", ".js", ".jsx"];
    for (const ext of extensions) {
      if (projectFilePaths.has(`${basePath}${ext}`)) {
        return `./${basePath}`;
      }
    }

    const indexFiles = ["index.ts", "index.tsx", "index.js", "index.jsx"];
    for (const indexFile of indexFiles) {
      if (projectFilePaths.has(`${basePath}/${indexFile}`)) {
        return `./${basePath}`;
      }
    }

    return null;
  };

  let result = code;

  result = result.replace(importRegex, (match, prefix, importPath, suffix) => {
    const resolved = resolveImportPath(importPath);
    if (resolved && resolved !== importPath) {
      return `${prefix}${resolved}${suffix}`;
    }
    return match;
  });

  result = result.replace(requireRegex, (match, prefix, importPath, suffix) => {
    const resolved = resolveImportPath(importPath);
    if (resolved && resolved !== importPath) {
      return `${prefix}${resolved}${suffix}`;
    }
    return match;
  });

  return result;
}

export function mergeSnackFiles(
  existing: SnackFiles,
  updates: SnackFiles
): SnackFiles {
  return {
    ...existing,
    ...updates,
  };
}
