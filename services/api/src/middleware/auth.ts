import type { Request, Response, NextFunction } from "express";
import { getSupabaseClient } from "../config/supabase";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import { AppDataSource, User } from "../db";

export interface AuthUser {
  id: string;
  email: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  userId: number;
  dbUser: User;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      data: null,
      error: { code: ERROR_CODES.UNAUTHORIZED, message: "Authentication required" },
    });
    return;
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseClient();

  if (!supabase) {
    logger.warn("Supabase not configured");
    res.status(503).json({
      data: null,
      error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
    });
    return;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Authentication required" },
      });
      return;
    }

    const userRepo = AppDataSource.getRepository(User);
    const dbUser = await userRepo.findOne({ where: { auth_user_id: data.user.id } });

    if (!dbUser || dbUser.deleted_flag) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Authentication required" },
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    authReq.user = {
      id: data.user.id,
      email: data.user.email || "",
      app_metadata: data.user.app_metadata || {},
      user_metadata: data.user.user_metadata || {},
    };

    next();
  } catch (err) {
    logger.error({ err }, "Auth middleware error");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseClient();

  if (!supabase) {
    next();
    return;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (!error && data.user) {
      const userRepo = AppDataSource.getRepository(User);
      const dbUser = await userRepo.findOne({ where: { auth_user_id: data.user.id } });

      if (dbUser && !dbUser.deleted_flag) {
        const authReq = req as AuthenticatedRequest;
        authReq.user = {
          id: data.user.id,
          email: data.user.email || "",
          app_metadata: data.user.app_metadata || {},
          user_metadata: data.user.user_metadata || {},
        };
        authReq.userId = dbUser.id;
        authReq.dbUser = dbUser;
      }
    }
  } catch {
    // Silently ignore for optional auth
  }

  next();
}