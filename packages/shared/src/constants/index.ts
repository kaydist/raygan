export const ERROR_CODES = {
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const SOCKET_EVENTS = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",
  AST_PATCH: "ast:patch",
  AST_PATCHED: "ast:patched",
  AST_SNAPSHOT: "ast:snapshot",
  AST_CONFLICT: "ast:conflict",
  GENERATE_STREAM: "generate:stream",
  GENERATE_COMPLETE: "generate:complete",
  GENERATE_ERROR: "generate:error",
  PREVIEW_RELOAD: "preview:reload",
  PREVIEW_ERROR: "preview:error",
  TERMINAL_INPUT: "terminal:input",
  TERMINAL_OUTPUT: "terminal:output",
  PRESENCE_JOIN: "presence:join",
  PRESENCE_LEAVE: "presence:leave",
} as const;
