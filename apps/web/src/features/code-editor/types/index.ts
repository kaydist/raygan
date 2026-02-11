// Code Editor feature types
export interface FileTab {
  path: string;
  name: string;
  language: string;
  isModified: boolean;
}

export interface EditorState {
  cursorPosition: { line: number; column: number };
  scrollPosition: { top: number; left: number };
}
