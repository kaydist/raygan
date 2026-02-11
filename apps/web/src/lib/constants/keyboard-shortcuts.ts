export const SHORTCUTS = {
  // Panel toggles
  TOGGLE_AGENT: { key: "1", modifier: "cmd" },
  FOCUS_CENTER: { key: "2", modifier: "cmd" },
  TOGGLE_PREVIEW: { key: "3", modifier: "cmd" },
  TOGGLE_TERMINAL: { key: "`", modifier: "cmd" },

  // Mode switching
  SWITCH_BUILDER: { key: "b", modifier: "cmd" },
  SWITCH_CODE: { key: "e", modifier: "cmd" },

  // Actions
  SAVE: { key: "s", modifier: "cmd" },
  UNDO: { key: "z", modifier: "cmd" },
  REDO: { key: "z", modifier: "cmd+shift" },
  COMMAND_PALETTE: { key: "k", modifier: "cmd" },
  QUICK_OPEN: { key: "p", modifier: "cmd" },
  SUBMIT_PROMPT: { key: "Enter", modifier: "cmd" },

  // Builder
  DELETE_COMPONENT: { key: "Backspace", modifier: null },
  DUPLICATE_COMPONENT: { key: "d", modifier: "cmd" },
  DESELECT: { key: "Escape", modifier: null },
} as const;

export type ShortcutKey = keyof typeof SHORTCUTS;

export function formatShortcut(shortcut: (typeof SHORTCUTS)[ShortcutKey]): string {
  const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");
  const modifierSymbol = isMac ? "⌘" : "Ctrl";

  if (!shortcut.modifier) return shortcut.key;

  const parts = shortcut.modifier.split("+").map((mod) => {
    if (mod === "cmd") return modifierSymbol;
    if (mod === "shift") return isMac ? "⇧" : "Shift";
    if (mod === "alt") return isMac ? "⌥" : "Alt";
    return mod;
  });

  return [...parts, shortcut.key.toUpperCase()].join(isMac ? "" : "+");
}
