// Re-export shared types
export type * from "@staq/shared";

// API-specific types
export interface ApiContext {
  requestId: string;
  userId?: string;
  plan?: string;
}

declare global {
  namespace Express {
    interface Request {
      context: ApiContext;
    }
  }
}
