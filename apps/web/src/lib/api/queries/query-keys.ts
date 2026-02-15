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

  conversations: {
    all: ["conversations"] as const,
    list: (projectId: number) => [...queryKeys.conversations.all, "list", projectId] as const,
    thread: (projectId: number) => [...queryKeys.conversations.all, "thread", projectId] as const,
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
