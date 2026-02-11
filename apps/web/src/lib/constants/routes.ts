export const ROUTES = {
  // Marketing
  HOME: "/",
  PRICING: "/pricing",
  DOCS: "/docs",

  // Auth
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  CALLBACK: "/callback",

  // Dashboard
  DASHBOARD: "/dashboard",
  SETTINGS: "/dashboard/settings",
  BILLING: "/dashboard/billing",

  // Workspace
  WORKSPACE: (projectId: string) => `/workspace/${projectId}` as const,
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
