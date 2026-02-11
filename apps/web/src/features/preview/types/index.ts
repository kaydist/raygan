// Preview feature types
export type DeviceType = "iphone" | "android" | "tablet";

export interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  type: DeviceType;
}

export interface PreviewError {
  message: string;
  line?: number;
  column?: number;
  file?: string;
}
