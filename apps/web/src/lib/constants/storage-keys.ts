export const STORAGE_KEYS = {
  ACCESS_TOKEN: "raygan_access_token",
  REFRESH_TOKEN: "raygan_refresh_token",
  USER_PREFERENCES: "raygan_user_preferences",
  WORKSPACE_LAYOUT: "raygan_workspace_layout",
  RECENT_PROJECTS: "raygan_recent_projects",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
