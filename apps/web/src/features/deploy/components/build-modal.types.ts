export type WizardStep = 1 | 2 | 3;
export type ModalView = "history" | "platform" | "wizard";

export interface AppInfo {
  name: string;
  version: string;
  packageName: string;
  iconPreview: string | null;
}
