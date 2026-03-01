import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";

export type WorkspaceMode = "agent" | "builder" | "code-editor";
export type PropertyTab = "style" | "props" | "events";
export type Theme = "light" | "dark" | "system";
export type ViewMode = "grid" | "list";
export type RightPanelMode = "preview" | "inspector";

export interface PanelSizes {
  left: number;
  center: number;
  right: number;
  bottom: number;
}

export interface CanvasOffset {
  x: number;
  y: number;
}

export interface ModalState {
  isOpen: boolean;
  data?: unknown;
}

export interface Modals {
  createProject: ModalState;
  deleteProject: ModalState;
  projectSettings: ModalState;
  connectBackend: ModalState;
  deployProject: ModalState;
  projectConfig: ModalState;
  commandPalette: ModalState;
  shortcuts: ModalState;
  confirm: ModalState & { title?: string; message?: string; onConfirm?: () => void };
  buildHistory: ModalState;
}

interface UIState {
  activeMode: WorkspaceMode;
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
  isBottomPanelOpen: boolean;
  isTerminalOpen: boolean;
  rightPanelMode: RightPanelMode;
  panelSizes: PanelSizes;
  canvasZoom: number;
  canvasOffset: CanvasOffset;
  expandedTreeNodes: Set<string>;
  propertyTab: PropertyTab;
  openFileTabs: string[];
  activeFileTab: string | null;
  commandPaletteOpen: boolean;
  theme: Theme;
  viewMode: ViewMode;
  isSidebarOpen: boolean;
  isMobileSidebarOpen: boolean;
  modals: Modals;
}

interface UIActions {
  setActiveMode: (mode: WorkspaceMode) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
  toggleTerminal: () => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setBottomPanelOpen: (open: boolean) => void;
  setTerminalOpen: (open: boolean) => void;
  setRightPanelMode: (mode: RightPanelMode) => void;
  setPanelSizes: (sizes: Partial<PanelSizes>) => void;
  setCanvasZoom: (zoom: number) => void;
  setCanvasOffset: (offset: CanvasOffset) => void;
  resetCanvasView: () => void;
  toggleTreeNode: (nodeId: string) => void;
  expandTreeNode: (nodeId: string) => void;
  collapseTreeNode: (nodeId: string) => void;
  setExpandedTreeNodes: (nodeIds: string[]) => void;
  setPropertyTab: (tab: PropertyTab) => void;
  openFileTab: (path: string) => void;
  closeFileTab: (path: string) => void;
  setActiveFileTab: (path: string | null) => void;
  reorderFileTabs: (fromIndex: number, toIndex: number) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  openModal: <K extends keyof Modals>(modal: K, data?: Modals[K]["data"]) => void;
  closeModal: (modal: keyof Modals) => void;
  closeAllModals: () => void;
  applyLayoutPreset: (preset: "chat-focus" | "build-focus" | "code-focus" | "balanced") => void;
  reset: () => void;
}

type UIStore = UIState & UIActions;

const defaultPanelSizes: PanelSizes = {
  left: 25,
  center: 50,
  right: 25,
  bottom: 0,
};

const defaultModals: Modals = {
  createProject: { isOpen: false },
  deleteProject: { isOpen: false },
  projectSettings: { isOpen: false },
  connectBackend: { isOpen: false },
  deployProject: { isOpen: false },
  projectConfig: { isOpen: false },
  commandPalette: { isOpen: false },
  shortcuts: { isOpen: false },
  confirm: { isOpen: false },
  buildHistory: { isOpen: false },
};

const initialState: UIState = {
  activeMode: "agent",
  isLeftPanelOpen: true,
  isRightPanelOpen: true,
  isBottomPanelOpen: false,
  isTerminalOpen: false,
  rightPanelMode: "preview",
  panelSizes: defaultPanelSizes,
  canvasZoom: 1,
  canvasOffset: { x: 0, y: 0 },
  expandedTreeNodes: new Set<string>(),
  propertyTab: "style",
  openFileTabs: [],
  activeFileTab: null,
  commandPaletteOpen: false,
  theme: "system",
  viewMode: "grid",
  isSidebarOpen: true,
  isMobileSidebarOpen: false,
  modals: defaultModals,
};

const layoutPresets = {
  "chat-focus": { left: 40, center: 60, right: 0, bottom: 0 },
  "build-focus": { left: 0, center: 70, right: 30, bottom: 0 },
  "code-focus": { left: 0, center: 100, right: 0, bottom: 0 },
  balanced: { left: 25, center: 50, right: 25, bottom: 0 },
};

export const useUIStore = create<UIStore>()(
  persist(
    immer((set, _get) => ({
      ...initialState,

      setActiveMode: (mode) =>
        set((state) => {
          state.activeMode = mode;
        }),

      toggleLeftPanel: () =>
        set((state) => {
          state.isLeftPanelOpen = !state.isLeftPanelOpen;
        }),

      toggleRightPanel: () =>
        set((state) => {
          state.isRightPanelOpen = !state.isRightPanelOpen;
        }),

      toggleBottomPanel: () =>
        set((state) => {
          state.isBottomPanelOpen = !state.isBottomPanelOpen;
        }),

      toggleTerminal: () =>
        set((state) => {
          state.isTerminalOpen = !state.isTerminalOpen;
        }),

      setLeftPanelOpen: (open) =>
        set((state) => {
          state.isLeftPanelOpen = open;
        }),

      setRightPanelOpen: (open) =>
        set((state) => {
          state.isRightPanelOpen = open;
        }),

      setBottomPanelOpen: (open) =>
        set((state) => {
          state.isBottomPanelOpen = open;
        }),

      setTerminalOpen: (open) =>
        set((state) => {
          state.isTerminalOpen = open;
        }),

      setRightPanelMode: (mode) =>
        set((state) => {
          state.rightPanelMode = mode;
        }),

      setPanelSizes: (sizes) =>
        set((state) => {
          state.panelSizes = { ...state.panelSizes, ...sizes };
        }),

      setCanvasZoom: (zoom) =>
        set((state) => {
          state.canvasZoom = Math.max(0.25, Math.min(4, zoom));
        }),

      setCanvasOffset: (offset) =>
        set((state) => {
          state.canvasOffset = offset;
        }),

      resetCanvasView: () =>
        set((state) => {
          state.canvasZoom = 1;
          state.canvasOffset = { x: 0, y: 0 };
        }),

      toggleTreeNode: (nodeId) =>
        set((state) => {
          if (state.expandedTreeNodes.has(nodeId)) {
            state.expandedTreeNodes.delete(nodeId);
          } else {
            state.expandedTreeNodes.add(nodeId);
          }
        }),

      expandTreeNode: (nodeId) =>
        set((state) => {
          state.expandedTreeNodes.add(nodeId);
        }),

      collapseTreeNode: (nodeId) =>
        set((state) => {
          state.expandedTreeNodes.delete(nodeId);
        }),

      setExpandedTreeNodes: (nodeIds) =>
        set((state) => {
          state.expandedTreeNodes = new Set(nodeIds);
        }),

      setPropertyTab: (tab) =>
        set((state) => {
          state.propertyTab = tab;
        }),

      openFileTab: (path) =>
        set((state) => {
          if (!state.openFileTabs.includes(path)) {
            state.openFileTabs.push(path);
          }
          state.activeFileTab = path;
        }),

      closeFileTab: (path) =>
        set((state) => {
          const index = state.openFileTabs.indexOf(path);
          if (index !== -1) {
            state.openFileTabs.splice(index, 1);
            if (state.activeFileTab === path) {
              state.activeFileTab =
                state.openFileTabs[Math.min(index, state.openFileTabs.length - 1)] || null;
            }
          }
        }),

      setActiveFileTab: (path) =>
        set((state) => {
          state.activeFileTab = path;
        }),

      reorderFileTabs: (fromIndex, toIndex) =>
        set((state) => {
          const [removed] = state.openFileTabs.splice(fromIndex, 1);
          if (removed) {
            state.openFileTabs.splice(toIndex, 0, removed);
          }
        }),

      toggleCommandPalette: () =>
        set((state) => {
          state.commandPaletteOpen = !state.commandPaletteOpen;
        }),

      setCommandPaletteOpen: (open) =>
        set((state) => {
          state.commandPaletteOpen = open;
        }),

      setTheme: (theme) =>
        set((state) => {
          state.theme = theme;
        }),

      setViewMode: (mode) =>
        set((state) => {
          state.viewMode = mode;
        }),

      toggleSidebar: () =>
        set((state) => {
          state.isSidebarOpen = !state.isSidebarOpen;
        }),

      setSidebarOpen: (open) =>
        set((state) => {
          state.isSidebarOpen = open;
        }),

      toggleMobileSidebar: () =>
        set((state) => {
          state.isMobileSidebarOpen = !state.isMobileSidebarOpen;
        }),

      setMobileSidebarOpen: (open) =>
        set((state) => {
          state.isMobileSidebarOpen = open;
        }),

      openModal: (modal, data) =>
        set((state) => {
          state.modals[modal] = { isOpen: true, data };
        }),

      closeModal: (modal) =>
        set((state) => {
          state.modals[modal] = { isOpen: false };
        }),

      closeAllModals: () =>
        set((state) => {
          state.modals = defaultModals;
        }),

      applyLayoutPreset: (preset) =>
        set((state) => {
          const sizes = layoutPresets[preset];
          state.panelSizes = sizes;
          state.isLeftPanelOpen = sizes.left > 0;
          state.isRightPanelOpen = sizes.right > 0;
          state.isBottomPanelOpen = sizes.bottom > 0;
        }),

      reset: () =>
        set(() => ({
          ...initialState,
          expandedTreeNodes: new Set<string>(),
          rightPanelMode: "preview" as RightPanelMode,
        })),
    })),
    {
      name: "raygan-ui-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        viewMode: state.viewMode,
        isSidebarOpen: state.isSidebarOpen,
        isTerminalOpen: state.isTerminalOpen,
        panelSizes: state.panelSizes,
      }),
    }
  )
);
