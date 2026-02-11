import type { Request, Response } from "express";

import { ERROR_CODES } from "../constants";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    data: null,
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
