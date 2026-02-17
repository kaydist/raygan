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
  const normalizedPaths = Object.keys(fileTree).map(normalizeFilePath);
  const filePaths = new Set(normalizedPaths);

  for (const [path, content] of Object.entries(fileTree)) {
    let normalizedPath = normalizeFilePath(path);

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

function transformLocalImports(code: string, _currentFilePath: string, projectFilePaths: Set<string>): string {
  const importRegex = /(import\s+(?:[\w\s{},*]+\s+from\s+)?['"])([^'"]+)(['"])/g;
  const requireRegex = /(require\s*\(\s*['"])([^'"]+)(['"]\s*\))/g;

  const resolveImportPath = (importPath: string): string | null => {
    const hasRelativePrefix = importPath.startsWith("./") || importPath.startsWith("../");
    const hasAbsolutePrefix = importPath.startsWith("/");

    let basePath = importPath;
    if (importPath.startsWith("./")) {
      basePath = importPath.slice(2);
    } else if (importPath.startsWith("/")) {
      basePath = importPath.slice(1);
    }

    if (projectFilePaths.has(basePath)) {
      return hasRelativePrefix ? importPath : `./${basePath}`;
    }

    const extensions = [".ts", ".tsx", ".js", ".jsx"];
    for (const ext of extensions) {
      if (projectFilePaths.has(`${basePath}${ext}`)) {
        return hasRelativePrefix ? importPath : `./${basePath}`;
      }
    }

    const indexFiles = ["index.ts", "index.tsx", "index.js", "index.jsx"];
    for (const indexFile of indexFiles) {
      const indexPath = `${basePath}/${indexFile}`;
      if (projectFilePaths.has(indexPath)) {
        return `./${basePath}/index`;
      }
    }

    const isDirectoryWithFiles = Array.from(projectFilePaths).some(
      (p) => p.startsWith(`${basePath}/`)
    );

    if (isDirectoryWithFiles) {
      for (const indexFile of indexFiles) {
        if (projectFilePaths.has(`${basePath}/${indexFile}`)) {
          return `./${basePath}/index`;
        }
      }
    }

    if (!hasRelativePrefix && !hasAbsolutePrefix && isDirectoryWithFiles) {
      return `./${basePath}`;
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
