export const LAYOUT_STORAGE_KEY = "staq-workspace-layout";

export interface LayoutState {
  leftSize: number;
  centerSize: number;
  rightSize: number;
  layersSize: number;
  inspectorSize: number;
}

export const defaultLayout: LayoutState = {
  leftSize: 20,
  centerSize: 55,
  rightSize: 25,
  layersSize: 60,
  inspectorSize: 60,
};

export function getStoredLayout(projectId: string): LayoutState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(`${LAYOUT_STORAGE_KEY}-${projectId}`);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore
  }
  return null;
}

export function storeLayout(projectId: string, layout: LayoutState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${LAYOUT_STORAGE_KEY}-${projectId}`, JSON.stringify(layout));
  } catch {
    // Ignore
  }
}
