export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "APIError";
  }

  static fromResponse(response: {
    error?: { code: string; message: string; details?: Record<string, unknown> };
  }): APIError | null {
    if (!response.error) return null;
    return new APIError(
      response.error.code,
      response.error.message,
      400,
      response.error.details
    );
  }
}

export class ASTError extends Error {
  constructor(
    message: string,
    public nodeId?: string,
    public operation?: string
  ) {
    super(message);
    this.name = "ASTError";
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string = "AUTH_ERROR"
  ) {
    super(message);
    this.name = "AuthError";
  }
}
