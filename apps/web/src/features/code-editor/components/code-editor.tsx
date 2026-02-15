"use client";

import { useCallback } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

import { useProjectStore } from "@/stores";

interface CodeEditorProps {
  filePath: string;
  className?: string;
  readOnly?: boolean;
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  md: "markdown",
  css: "css",
  html: "html",
};

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGE_MAP[ext] ?? "plaintext";
}

export function CodeEditor({ filePath, className, readOnly = false }: CodeEditorProps) {
  const file = useProjectStore((s) => s.files.get(filePath));
  const updateFile = useProjectStore((s) => s.updateFile);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined && !readOnly) {
        updateFile(filePath, value);
      }
    },
    [filePath, updateFile, readOnly]
  );

  const handleMount: OnMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 13,
      lineHeight: 20,
      padding: { top: 8 },
      scrollBeyondLastLine: false,
      renderLineHighlight: "line",
      cursorBlinking: "smooth",
      smoothScrolling: true,
    });
  }, []);

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        File not found
      </div>
    );
  }

  return (
    <div className={className}>
      <Editor
        height="100%"
        defaultLanguage={getLanguageFromPath(filePath)}
        language={file.language ?? getLanguageFromPath(filePath)}
        value={file.content ?? ""}
        onChange={handleChange}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          readOnly,
          wordWrap: "on",
          tabSize: 2,
          automaticLayout: true,
        }}
        loading={
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      />
    </div>
  );
}
