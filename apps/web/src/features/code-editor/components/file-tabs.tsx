"use client";

import { useCallback, useRef, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUIStore, useProjectStore } from "@/stores";

interface FileTabProps {
  path: string;
  isActive: boolean;
  isDirty: boolean;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function FileTab({ path, isActive, isDirty, onSelect, onClose, onContextMenu }: FileTabProps) {
  const fileName = path.split("/").pop() || path;
  const ext = fileName.split(".").pop()?.toLowerCase();

  const getIconColor = () => {
    switch (ext) {
      case "ts":
      case "tsx":
        return "text-[#3178c6]";
      case "js":
      case "jsx":
        return "text-[#f7df1e]";
      case "json":
        return "text-[#cbcb41]";
      case "css":
        return "text-[#563d7c]";
      case "md":
        return "text-[#083fa1]";
      default:
        return "text-muted-foreground";
    }
  };

  const getIcon = () => {
    switch (ext) {
      case "ts":
      case "tsx":
        return "TS";
      case "js":
      case "jsx":
        return "JS";
      case "json":
        return "{}";
      default:
        return null;
    }
  };

  return (
    <div
      role="tab"
      aria-selected={isActive}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={cn(
        "group relative flex h-9 min-w-[120px] max-w-[200px] cursor-pointer items-center gap-2 border-r border-border px-3 text-sm transition-colors",
        isActive
          ? "bg-background text-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted/80"
      )}
    >
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
      )}

      <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center text-[10px] font-bold", getIconColor())}>
        {getIcon()}
      </span>

      <span className="flex-1 truncate">{fileName}</span>

      {isDirty && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-yellow-500" />
      )}

      <button
        onClick={onClose}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-accent",
          !isActive && "opacity-0 group-hover:opacity-100"
        )}
        aria-label={`Close ${fileName}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  path: string | null;
}

export function FileTabs() {
  const openFileTabs = useUIStore((s) => s.openFileTabs);
  const activeFileTab = useUIStore((s) => s.activeFileTab);
  const setActiveFileTab = useUIStore((s) => s.setActiveFileTab);
  const closeFileTab = useUIStore((s) => s.closeFileTab);
  const files = useProjectStore((s) => s.files);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    path: null,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback((path: string) => {
    setActiveFileTab(path);
  }, [setActiveFileTab]);

  const handleClose = useCallback((e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    closeFileTab(path);
  }, [closeFileTab]);

  const handleContextMenu = useCallback((e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      path,
    });
  }, []);

  const handleCloseOthers = useCallback(() => {
    if (!contextMenu.path) return;
    openFileTabs.forEach((tab) => {
      if (tab !== contextMenu.path) {
        closeFileTab(tab);
      }
    });
    setContextMenu({ isOpen: false, x: 0, y: 0, path: null });
  }, [contextMenu.path, openFileTabs, closeFileTab]);

  const handleCloseAll = useCallback(() => {
    openFileTabs.forEach((tab) => closeFileTab(tab));
    setContextMenu({ isOpen: false, x: 0, y: 0, path: null });
  }, [openFileTabs, closeFileTab]);

  const handleCloseToRight = useCallback(() => {
    if (!contextMenu.path) return;
    const index = openFileTabs.indexOf(contextMenu.path);
    if (index !== -1) {
      openFileTabs.slice(index + 1).forEach((tab) => closeFileTab(tab));
    }
    setContextMenu({ isOpen: false, x: 0, y: 0, path: null });
  }, [contextMenu.path, openFileTabs, closeFileTab]);

  if (openFileTabs.length === 0) {
    return null;
  }

  return (
    <>
      <div
        ref={containerRef}
        role="tablist"
        className="flex h-9 min-h-[36px] items-stretch overflow-x-auto border-b border-border bg-muted/30 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border"
      >
        {openFileTabs.map((path) => {
          const file = files.get(path);
          const isDirty = file?.modified ?? false;

          return (
            <FileTab
              key={path}
              path={path}
              isActive={activeFileTab === path}
              isDirty={isDirty}
              onSelect={() => handleSelect(path)}
              onClose={(e) => handleClose(e, path)}
              onContextMenu={(e) => handleContextMenu(e, path)}
            />
          );
        })}
      </div>

      {contextMenu.isOpen && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setContextMenu({ isOpen: false, x: 0, y: 0, path: null })}
          />
          <div
            className="fixed z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-md"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                if (contextMenu.path) closeFileTab(contextMenu.path);
                setContextMenu({ isOpen: false, x: 0, y: 0, path: null });
              }}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              Close
            </button>
            <button
              onClick={handleCloseOthers}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              Close Others
            </button>
            <button
              onClick={handleCloseToRight}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              Close to the Right
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={handleCloseAll}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              Close All
            </button>
          </div>
        </>
      )}
    </>
  );
}
