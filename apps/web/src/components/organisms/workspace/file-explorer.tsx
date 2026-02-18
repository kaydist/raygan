"use client";

import { useMemo, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUIStore, useProjectStore, type FileEntry } from "@/stores";

interface FileTreeItemProps {
  entry: FileEntry;
  depth: number;
}

function FileTreeItem({ entry, depth }: FileTreeItemProps) {
  const { expandedTreeNodes, toggleTreeNode, openFileTab, activeFileTab } = useUIStore();
  const isExpanded = expandedTreeNodes.has(entry.path);
  const isActive = activeFileTab === entry.path;
  const isFolder = entry.type === "folder";

  const handleClick = useCallback(() => {
    if (isFolder) {
      toggleTreeNode(entry.path);
    } else {
      openFileTab(entry.path);
    }
  }, [isFolder, entry.path, toggleTreeNode, openFileTab]);

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
        return <span className="text-[#3178c6]">TS</span>;
      case "js":
      case "jsx":
        return <span className="text-[#f7df1e]">JS</span>;
      case "json":
        return <span className="text-[#cbcb41]">{"{}"}</span>;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          "flex w-full items-center gap-1 rounded-sm px-2 py-1 text-left text-sm text-white hover:bg-accent hover:text-black",
          isActive && "bg-accent text-black"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder ? (
          <>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-yellow-500" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-yellow-500" />
            )}
          </>
        ) : (
          <>
            <span className="h-4 w-4 shrink-0" />
            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[10px] font-bold">
              {getFileIcon(entry.name)}
            </span>
          </>
        )}
        <span className="truncate">{entry.name}</span>
        {entry.modified && (
          <span className="ml-auto h-2 w-2 rounded-full bg-yellow-500" />
        )}
      </button>
      {isFolder && isExpanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem key={child.path} entry={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </>
  );
}

export function FileExplorer() {
  const files = useProjectStore((s) => s.files);

  const fileTree = useMemo(() => {
    const tree: FileEntry[] = [];
    const folderMap = new Map<string, FileEntry>();

    const sortedPaths = Array.from(files.keys()).sort();

    for (const path of sortedPaths) {
      const entry = files.get(path);
      if (!entry) continue;

      const parts = path.split("/");

      if (parts.length === 1) {
        tree.push({ ...entry });
      } else {
        let currentPath = "";
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i]!;
          const parentPath = currentPath;
          currentPath = currentPath ? `${currentPath}/${part}` : part;

          if (!folderMap.has(currentPath)) {
            const folder: FileEntry = {
              path: currentPath,
              name: part,
              type: "folder",
              children: [],
            };
            folderMap.set(currentPath, folder);

            if (parentPath && folderMap.has(parentPath)) {
              folderMap.get(parentPath)!.children!.push(folder);
            } else if (!parentPath) {
              tree.push(folder);
            }
          }
        }

        const parentPath = parts.slice(0, -1).join("/");
        const parent = folderMap.get(parentPath);
        if (parent) {
          parent.children!.push({ ...entry });
        }
      }
    }

    const sortTree = (items: FileEntry[]): FileEntry[] => {
      return items.sort((a, b) => {
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;
        return a.name.localeCompare(b.name);
      }).map(item => ({
        ...item,
        children: item.children ? sortTree(item.children) : undefined,
      }));
    };

    return sortTree(tree);
  }, [files]);

  if (files.size === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
        <Folder className="mb-2 h-8 w-8" />
        <p className="text-sm">No files yet</p>
        <p className="text-xs">Generate code using the chat panel</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto py-2">
      {fileTree.map((entry) => (
        <FileTreeItem key={entry.path} entry={entry} depth={0} />
      ))}
    </div>
  );
}
