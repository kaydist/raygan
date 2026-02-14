export const STORAGE_KEYS = {
  ACCESS_TOKEN: "staq_access_token",
  REFRESH_TOKEN: "staq_refresh_token",
  USER_PREFERENCES: "staq_user_preferences",
  WORKSPACE_LAYOUT: "staq_workspace_layout",
  RECENT_PROJECTS: "staq_recent_projects",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
