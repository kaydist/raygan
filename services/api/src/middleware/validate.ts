import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";
import { ERROR_CODES } from "../constants";

type ValidationTarget = "body" | "query" | "params";

interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidateOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors: Record<string, unknown> = {};
    const targets: ValidationTarget[] = ["body", "query", "params"];

    for (const target of targets) {
      const schema = schemas[target];
      if (!schema) continue;

      const result = schema.safeParse(req[target]);

      if (!result.success) {
        errors[target] = formatZodError(result.error);
      } else {
        req[target] = result.data;
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        data: null,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Validation failed",
          details: errors,
        },
      });
      return;
    }

    next();
  };
}

function formatZodError(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}
