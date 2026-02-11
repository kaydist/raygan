import type { NextFunction, Request, Response } from "express";

import { logger } from "../config";
import { ERROR_CODES } from "../constants";

export interface ApiError extends Error {
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.status || 500;
  const code = err.code || ERROR_CODES.INTERNAL_ERROR;
  const message = err.message || "An unexpected error occurred";

  logger.error(
    {
      err,
      requestId: req.context?.requestId,
      path: req.path,
      method: req.method,
    },
    `Error: ${message}`
  );

  res.status(status).json({
    data: null,
    error: {
      code,
      message,
      details: err.details,
    },
  });
}
