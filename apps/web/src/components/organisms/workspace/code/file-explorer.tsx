"use client";

import { useMemo, useCallback, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Trash2,
  FilePlus,
  FolderPlus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUIStore, useProjectStore, type FileEntry } from "@/stores";
import { filesApi } from "@/lib/api";

interface FileTreeItemProps {
  entry: FileEntry;
  depth: number;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}

function FileTreeItem({ entry, depth, onContextMenu }: FileTreeItemProps) {
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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, entry);
  }, [entry, onContextMenu]);

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
        onContextMenu={handleContextMenu}
        className={cn(
          "group flex w-full items-center gap-1 rounded-sm px-2 py-1 text-left text-sm text-white hover:bg-accent hover:text-black",
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
        <span className="flex-1 truncate">{entry.name}</span>
        {entry.modified && (
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
        )}
      </button>
      {isFolder && isExpanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem key={child.path} entry={child} depth={depth + 1} onContextMenu={onContextMenu} />
          ))}
        </div>
      )}
    </>
  );
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  entry: FileEntry | null;
}

interface CreateDialogState {
  isOpen: boolean;
  type: "file" | "folder";
  parentPath: string;
}

export function FileExplorer() {
  const files = useProjectStore((s) => s.files);
  const currentProject = useProjectStore((s) => s.currentProject);
  const deleteFile = useProjectStore((s) => s.deleteFile);
  const createFile = useProjectStore((s) => s.createFile);
  const closeFileTab = useUIStore((s) => s.closeFileTab);
  const openFileTab = useUIStore((s) => s.openFileTab);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    entry: null,
  });

  const [createDialog, setCreateDialog] = useState<CreateDialogState>({
    isOpen: false,
    type: "file",
    parentPath: "",
  });

  const [newItemName, setNewItemName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: FileEntry) => {
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      entry,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({ isOpen: false, x: 0, y: 0, entry: null });
  }, []);

  const handleDelete = useCallback(async () => {
    if (!contextMenu.entry || !currentProject?.id) return;

    const entry = contextMenu.entry;
    closeContextMenu();

    if (entry.type === "folder") {
      return;
    }

    setIsDeleting(true);
    try {
      if (entry.uuid) {
        await filesApi.delete(currentProject.id.toString(), entry.uuid);
      }
      deleteFile(entry.path);
      closeFileTab(entry.path);
    } catch (error) {
      console.error("Failed to delete file:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [contextMenu.entry, currentProject?.id, deleteFile, closeFileTab, closeContextMenu]);

  const handleOpenCreateDialog = useCallback((type: "file" | "folder", parentPath = "") => {
    setCreateDialog({ isOpen: true, type, parentPath });
    setNewItemName("");
    closeContextMenu();
  }, [closeContextMenu]);

  const handleCreate = useCallback(async () => {
    if (!newItemName.trim() || !currentProject?.id) return;

    const path = createDialog.parentPath
      ? `${createDialog.parentPath}/${newItemName.trim()}`
      : newItemName.trim();

    setIsCreating(true);
    try {
      const defaultContent = getDefaultContent(newItemName.trim());

      const response = await filesApi.create(currentProject.id.toString(), {
        path,
        content: defaultContent,
        language: getLanguageFromName(newItemName.trim()),
      });

      createFile(path, defaultContent, createDialog.type);
      useProjectStore.setState((s) => {
        const f = s.files.get(path);
        if (f) {
          s.files.set(path, { ...f, uuid: response.uuid });
        }
      });

      if (createDialog.type === "file") {
        openFileTab(path);
      }

      setCreateDialog({ isOpen: false, type: "file", parentPath: "" });
      setNewItemName("");
    } catch (error) {
      console.error("Failed to create file:", error);
    } finally {
      setIsCreating(false);
    }
  }, [newItemName, currentProject?.id, createDialog, createFile, openFileTab]);

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
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">Explorer</span>
          <button
            onClick={() => handleOpenCreateDialog("file")}
            className="rounded p-1 hover:bg-accent"
            title="New File"
          >
            <FilePlus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-4 text-center text-muted-foreground">
          <Folder className="mb-2 h-8 w-8" />
          <p className="text-sm">No files yet</p>
          <p className="text-xs">Generate code using the chat panel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">Explorer</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenCreateDialog("file")}
            className="rounded p-1 hover:bg-accent hover:text-black text-white"
            title="New File"
          >
            <FilePlus className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleOpenCreateDialog("folder")}
            className="rounded p-1 hover:bg-accent hover:text-black text-white"
            title="New Folder"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-2">
        {fileTree.map((entry) => (
          <FileTreeItem key={entry.path} entry={entry} depth={0} onContextMenu={handleContextMenu} />
        ))}
      </div>

      {contextMenu.isOpen && (
        <>
          <div className="fixed inset-0 z-50" onClick={closeContextMenu} />
          <div
            className="fixed z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-md"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.entry?.type === "folder" && (
              <>
                <button
                  onClick={() => handleOpenCreateDialog("file", contextMenu.entry?.path)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <FilePlus className="h-4 w-4" />
                  New File
                </button>
                <button
                  onClick={() => handleOpenCreateDialog("folder", contextMenu.entry?.path)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <FolderPlus className="h-4 w-4" />
                  New Folder
                </button>
                <div className="my-1 h-px bg-border" />
              </>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting || contextMenu.entry?.type === "folder"}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </>
      )}

      {createDialog.isOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setCreateDialog({ isOpen: false, type: "file", parentPath: "" })} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-4 shadow-lg">
            <h3 className="mb-4 text-lg font-medium">
              Create New {createDialog.type === "file" ? "File" : "Folder"}
            </h3>
            {createDialog.parentPath && (
              <p className="mb-2 text-xs text-muted-foreground">
                In: {createDialog.parentPath}/
              </p>
            )}
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setCreateDialog({ isOpen: false, type: "file", parentPath: "" });
              }}
              placeholder={createDialog.type === "file" ? "filename.tsx" : "folder-name"}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setCreateDialog({ isOpen: false, type: "file", parentPath: "" })}
                className="rounded-md px-3 py-1.5 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newItemName.trim() || isCreating}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getDefaultContent(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
      return `export default function Component() {\n  return (\n    <div>\n      \n    </div>\n  );\n}\n`;
    case "ts":
      return `export {};\n`;
    case "js":
    case "jsx":
      return `export default function Component() {\n  return (\n    <div>\n      \n    </div>\n  );\n}\n`;
    case "json":
      return `{\n  \n}\n`;
    case "css":
      return `/* styles */\n`;
    default:
      return "";
  }
}

function getLanguageFromName(filename: string): string | undefined {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
      return "typescript";
    case "tsx":
      return "typescriptreact";
    case "js":
      return "javascript";
    case "jsx":
      return "javascriptreact";
    case "json":
      return "json";
    case "css":
      return "css";
    case "md":
      return "markdown";
    default:
      return undefined;
  }
}
