"use client";

import { useEffect, useRef } from "react";

import { useUIStore, useProjectStore } from "@/stores";

export interface UseEditorKeyboardOptions {
  onSave?: (path: string, content: string) => void;
}

export function useEditorKeyboard(options: UseEditorKeyboardOptions = {}) {
  const { onSave } = options;
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      if (cmdKey && e.key === "s") {
        e.preventDefault();
        const activeFileTab = useUIStore.getState().activeFileTab;
        const files = useProjectStore.getState().files;

        if (activeFileTab && onSaveRef.current) {
          const file = files.get(activeFileTab);
          if (file) {
            onSaveRef.current(activeFileTab, file.content || "");
          }
        }
      }

      if (cmdKey && e.key === "p") {
        e.preventDefault();
        useUIStore.getState().setCommandPaletteOpen(true);
      }

      if (cmdKey && e.key === "w") {
        e.preventDefault();
        const activeFileTab = useUIStore.getState().activeFileTab;
        if (activeFileTab) {
          useUIStore.getState().closeFileTab(activeFileTab);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);
}
