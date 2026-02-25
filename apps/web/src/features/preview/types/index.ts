import type { SnackFiles } from "snack-sdk";

export type Platform = "ios" | "android" | "web";

export type PreviewMode = "web" | "device";

export type DeviceType = "iphone" | "android" | "tablet";

export interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  type: DeviceType;
}

export type DeviceConnectionStatus = "disconnected" | "connecting" | "connected";

export interface ConnectedDevice {
  id: string;
  name: string;
  platform: Platform;
  status: DeviceConnectionStatus;
}

export interface ConsoleLog {
  id: string;
  type: "log" | "warn" | "error" | "info";
  message: string;
  timestamp: number;
  payload?: unknown[];
}

export interface SnackState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  url: string | null;
  webPreviewURL: string | null;
  channel: string | null;
  connectedDevices: ConnectedDevice[];
  deviceCount: number;
  logs: ConsoleLog[];
}

export interface SnackError {
  message: string;
  lineNumber?: number;
  columnNumber?: number;
  filename?: string;
  stack?: string;
}

export interface PreviewError {
  message: string;
  line?: number;
  column?: number;
  file?: string;
}

export interface SnackDependency {
  version: string;
  handle?: string;
}

export interface SnackDependencies {
  [name: string]: SnackDependency;
}

export interface ProjectFile {
  path: string;
  content: string;
  type: "code" | "asset";
}

export interface SnackSessionConfig {
  name?: string;
  description?: string;
  sdkVersion?: string;
  files?: SnackFiles;
  dependencies?: SnackDependencies;
  webPreviewRef?: React.RefObject<Window | null>;
  webPlayerURL?: string;
}

export interface UseSnackOptions {
  name?: string;
  description?: string;
  sdkVersion?: string;
  autoConnect?: boolean;
  webPreviewRef?: React.RefObject<Window | null>;
  webPlayerURL?: string;
}

export interface UseSnackReturn {
  state: SnackState;
  updateFiles: (files: SnackFiles) => void;
  updateDependencies: (deps: SnackDependencies) => void;
  getQRCodeURL: () => string | null;
  getWebPreviewURL: () => string | null;
  getSnackURL: () => string | null;
  errors: SnackError[];
  connect: () => Promise<void>;
  disconnect: () => void;
  clearLogs: () => void;
}

export interface UseSnackSyncOptions {
  projectId: string;
  enabled?: boolean;
  debounceMs?: number;
  webPreviewURL?: string | null;
}

export interface DeviceFrameProps {
  platform: Platform;
  children: React.ReactNode;
  className?: string;
}
