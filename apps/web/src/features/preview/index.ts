export {
  SnackPreview,
  QRCodeDisplay,
  DeviceSelector,
  DeviceFrame,
  PreviewToolbar,
  ConsolePanel,
} from "./components";

export { useSnack, useSnackSync, useSnackPreview } from "./hooks";

export type {
  Platform,
  PreviewMode,
  DeviceType,
  DeviceConfig,
  SnackState,
  SnackError,
  PreviewError,
  SnackDependency,
  SnackDependencies,
  ProjectFile,
  SnackSessionConfig,
  UseSnackOptions,
  UseSnackReturn,
  UseSnackSyncOptions,
  DeviceFrameProps,
  ConsoleLog,
  ConnectedDevice,
  DeviceConnectionStatus,
} from "./types";

export {
  createSnackSession,
  getSnackWebPreviewURL,
  getSnackQRCodeURL,
  formatSnackError,
  transformProjectFilesToSnack,
  transformFileTreeToSnack,
  normalizeFilePath,
  extractDependenciesFromCode,
  mergeSnackFiles,
} from "./utils";
