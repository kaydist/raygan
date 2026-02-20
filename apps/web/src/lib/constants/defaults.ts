interface PublicSettings {
  plans: unknown[];
  enabledModels: unknown[];
  enabledBackends: unknown[];
  featureFlags: Record<string, boolean>;
  maxProjectsPerPlan: Record<string, number>;
  maintenanceMode: boolean;
}

// Fallback values used when settings haven't loaded from backend yet
export const DEFAULT_SETTINGS: Partial<PublicSettings> = {
  plans: [],
  enabledModels: [],
  enabledBackends: [],
  featureFlags: {},
  maxProjectsPerPlan: {
    free: 3,
    starter: 10,
    pro: 50,
    team: -1,
  },
  maintenanceMode: false,
};

export const DEFAULT_CREDITS: Record<string, number> = {
  free: 20,
  starter: 100,
  pro: 300,
  team: 700,
  enterprise: -1,
};

export const DEFAULT_WORKSPACE_LAYOUT = {
  sizes: {
    left: 25,
    center: 50,
    right: 25,
    bottom: 0,
  },
  collapsed: {
    left: false,
    right: false,
    bottom: true,
  },
};

export const DEFAULT_EDITOR_OPTIONS = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: "on" as const,
  minimap: { enabled: true },
  lineNumbers: "on" as const,
};
