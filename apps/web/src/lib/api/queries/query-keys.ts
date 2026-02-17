export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },

  users: {
    all: ["users"] as const,
    me: () => [...queryKeys.users.all, "me"] as const,
  },

  organizations: {
    all: ["organizations"] as const,
    list: () => [...queryKeys.organizations.all, "list"] as const,
    detail: (uuid: string) => [...queryKeys.organizations.all, "detail", uuid] as const,
  },

  projects: {
    all: ["projects"] as const,
    list: (params?: { organization_id?: number; include_archived?: boolean }) =>
      [...queryKeys.projects.all, "list", params] as const,
    detail: (uuid: string) => [...queryKeys.projects.all, "detail", uuid] as const,
  },

  files: {
    all: ["files"] as const,
    list: (projectId: string) => [...queryKeys.files.all, "list", projectId] as const,
    snack: (projectId: string) => [...queryKeys.files.all, "snack", projectId] as const,
    tree: (projectId: string) => [...queryKeys.files.all, "tree", projectId] as const,
    detail: (projectId: string, fileId: string) =>
      [...queryKeys.files.all, "detail", projectId, fileId] as const,
  },

  conversations: {
    all: ["conversations"] as const,
    list: (projectId: string) => [...queryKeys.conversations.all, "list", projectId] as const,
    detail: (conversationId: string) => [...queryKeys.conversations.all, "detail", conversationId] as const,
  },

  models: {
    all: ["models"] as const,
    list: () => [...queryKeys.models.all, "list"] as const,
    detail: (id: number) => [...queryKeys.models.all, "detail", id] as const,
  },

  settings: {
    all: ["settings"] as const,
    get: () => [...queryKeys.settings.all, "get"] as const,
  },

  health: {
    all: ["health"] as const,
    check: () => [...queryKeys.health.all, "check"] as const,
  },
} as const;
