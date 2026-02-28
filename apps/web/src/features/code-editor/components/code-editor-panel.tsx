"use client";

import { useMemo } from "react";
import { FileCode2, Plus, RefreshCw, Lock } from "lucide-react";
import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";
import { InlineBanner } from "@/components/atoms";
import { useUIStore, useProjectStore } from "@/stores";
import { useASTSync } from "@/hooks";
import { FileTabs } from "./file-tabs";

const CodeEditor = dynamic(
  () => import("./code-editor").then((mod) => ({ default: mod.CodeEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading editor...</span>
        </div>
      </div>
    ),
  }
);

interface CodeEditorPanelProps {
  className?: string;
  readOnly?: boolean;
}

export function CodeEditorPanel({ className, readOnly = false }: CodeEditorPanelProps) {
  const activeFileTab = useUIStore((s) => s.activeFileTab);
  const openFileTabs = useUIStore((s) => s.openFileTabs);
  const files = useProjectStore((s) => s.files);

  const { isSyncing, parseErrors, isReadOnly: isPlanReadOnly, forceSync } = useASTSync({
    debounceMs: 300,
    enabled: true,
  });

  const effectiveReadOnly = readOnly || isPlanReadOnly;

  const breadcrumbs = useMemo(() => {
    if (!activeFileTab) return [];
    return activeFileTab.split("/");
  }, [activeFileTab]);

  if (files.size === 0) {
    return (
      <div className={cn("flex h-full flex-col", className)}>
        <EmptyState />
      </div>
    );
  }

  if (openFileTabs.length === 0) {
    return (
      <div className={cn("flex h-full flex-col", className)}>
        <NoOpenFilesState />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      <FileTabs />

      {isPlanReadOnly && (
        <InlineBanner
          variant="warning"
          message="Free plan: Code editor is read-only. Upgrade to edit code directly."
          icon={Lock}
          className="rounded-none border-x-0 border-t-0"
        />
      )}

      {parseErrors.length > 0 && (
        <InlineBanner
          variant="error"
          message={parseErrors[0]?.message ?? "Parse error"}
          className="rounded-none border-x-0 border-t-0"
        />
      )}

      {activeFileTab && breadcrumbs.length > 1 && (
        <div className="flex h-6 items-center gap-1 border-b border-border bg-muted/20 px-3 text-xs text-muted-foreground">
          {breadcrumbs.map((part, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && <span className="text-muted-foreground/50">/</span>}
              <span className={index === breadcrumbs.length - 1 ? "text-foreground" : ""}>
                {part}
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        {activeFileTab && (
          <CodeEditor
            key={activeFileTab}
            filePath={activeFileTab}
            className="h-full w-full"
            readOnly={effectiveReadOnly}
          />
        )}
      </div>

      <StatusBar isSyncing={isSyncing} onForceSync={forceSync} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileCode2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-medium">No Files Yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate code using the chat panel or create a new file
        </p>
      </div>
      <div className="flex gap-2">
        <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          New File
        </button>
      </div>
    </div>
  );
}

function NoOpenFilesState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileCode2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-medium">No Open Files</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a file from the explorer to open it
        </p>
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">⌘+P</kbd> Quick Open
        </p>
        <p>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">⌘+S</kbd> Save File
        </p>
      </div>
    </div>
  );
}

interface StatusBarProps {
  isSyncing?: boolean;
  onForceSync?: () => void;
}

function StatusBar({ isSyncing, onForceSync }: StatusBarProps) {
  const activeFileTab = useUIStore((s) => s.activeFileTab);
  const files = useProjectStore((s) => s.files);

  if (!activeFileTab) return null;

  const file = files.get(activeFileTab);
  const language = file?.language || getLanguageDisplay(activeFileTab);
  const lineCount = (file?.content || "").split("\n").length;

  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-muted/30 px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>{language}</span>
        <span>UTF-8</span>
        {isSyncing && (
          <span className="flex items-center gap-1 text-primary">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Syncing...
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={onForceSync}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
          title="Force sync AST"
        >
          <RefreshCw className="h-3 w-3" />
          Sync
        </button>
        <span>Ln {lineCount}</span>
        <span>Spaces: 2</span>
      </div>
    </div>
  );
}

function getLanguageDisplay(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
      return "TypeScript";
    case "tsx":
      return "TypeScript React";
    case "js":
      return "JavaScript";
    case "jsx":
      return "JavaScript React";
    case "json":
      return "JSON";
    case "md":
      return "Markdown";
    case "css":
      return "CSS";
    case "html":
      return "HTML";
    default:
      return "Plain Text";
  }
}
