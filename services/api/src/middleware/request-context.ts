import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

export function requestContext(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  req.context = {
    requestId: (req.headers["x-request-id"] as string) || randomUUID(),
  };
  next();
}
