import type { SnackFiles } from "snack-sdk";

import type { ProjectFile } from "../types";

const SUPPORTED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".json", ".md"];

const ASSET_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];

export function transformProjectFilesToSnack(files: ProjectFile[]): SnackFiles {
  const snackFiles: SnackFiles = {};

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
        contents: file.content,
      };
    }
  }

  return snackFiles;
}

export function transformFileTreeToSnack(
  fileTree: Record<string, string>
): SnackFiles {
  const snackFiles: SnackFiles = {};

  for (const [path, content] of Object.entries(fileTree)) {
    let normalizedPath = normalizeFilePath(path);

    // Snack expects App.js as entry point - convert App.tsx to App.js
    if (normalizedPath === "App.tsx" || normalizedPath === "App.ts") {
      normalizedPath = "App.js";
    }

    console.log("[STAQ-DEBUG] Transforming file:", { original: path, normalized: normalizedPath });

    if (isAssetFile(path)) {
      snackFiles[normalizedPath] = {
        type: "ASSET",
        contents: content,
      };
    } else if (isSupportedCodeFile(path)) {
      snackFiles[normalizedPath] = {
        type: "CODE",
        contents: content,
      };
    }
  }

  return snackFiles;
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

export function mergeSnackFiles(
  existing: SnackFiles,
  updates: SnackFiles
): SnackFiles {
  return {
    ...existing,
    ...updates,
  };
}
