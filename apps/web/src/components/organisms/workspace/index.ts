export { WorkspaceLayout } from "./workspace-layout";
export { ResizeHandle } from "./resize-handle";
export { PanelHeader } from "./panel-header";
export { RightPanel } from "./right-panel";
export { StatusBar } from "./status-bar";
export { BottomPanel } from "./bottom-panel";
export { ActivityBar } from "./activity-bar";
export { LAYOUT_STORAGE_KEY, defaultLayout, getStoredLayout, storeLayout } from "./constants";
export type { LayoutState } from "./constants";

export { AgentPanel } from "./agent";
export {
  BuilderLeftPanel,
  BuilderCanvas,
  BuilderInspector,
  LayersPanel,
  PropertyInspector,
  ComponentPalette,
} from "./builder";
export { FileExplorer, CenterCanvas } from "./code";
export { PreviewPanel } from "./preview";
export { WorkspaceToolbar } from "./workspace-toolbar";
