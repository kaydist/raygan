export const QUERY_KEYS = {
  // Settings
  settings: ["settings"] as const,

  // Auth
  user: ["user"] as const,
  billing: ["billing"] as const,

  // Projects
  projects: ["projects"] as const,
  project: (id: string) => ["project", id] as const,
  projectFiles: (id: string) => ["project", id, "files"] as const,
  projectConversation: (id: string) => ["project", id, "conversation"] as const,

  // Models
  models: ["models"] as const,
  model: (id: string) => ["model", id] as const,

  // Backends
  backends: ["backends"] as const,
  backendSchema: (projectId: string) =>
    ["project", projectId, "backend", "schema"] as const,

  // Builds
  builds: (projectId: string) => ["builds", projectId] as const,
  build: (projectId: string, buildId: string) => ["build", projectId, buildId] as const,
} as const;
