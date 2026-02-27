import { createHash } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { getSupabaseClient } from "../config/supabase";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import { AppDataSource, User, Organization } from "../db";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../lib";

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
  currentOrganization: Organization;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      data: null,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: "Authentication required",
      },
    });
    return;
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseClient();

  if (!supabase) {
    logger.warn("Supabase not configured");
    res.status(503).json({
      data: null,
      error: {
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        message: "Service temporarily unavailable",
      },
    });
    return;
  }

  try {
    const tokenHash = createHash("sha256").update(token).digest("hex").slice(0, 16);

    let supabaseUserId: string;
    let supabaseEmail: string;
    let appMetadata: Record<string, unknown> = {};
    let userMetadata: Record<string, unknown> = {};

    const cachedAuth = await CacheService.get<{ id: string; email: string }>(
      CACHE_KEYS.auth.supabaseUser(tokenHash)
    );

    if (cachedAuth) {
      supabaseUserId = cachedAuth.id;
      supabaseEmail = cachedAuth.email;
    } else {
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        res.status(401).json({
          data: null,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: "Authentication required",
          },
        });
        return;
      }

      supabaseUserId = data.user.id;
      supabaseEmail = data.user.email || "";
      appMetadata = data.user.app_metadata || {};
      userMetadata = data.user.user_metadata || {};

      await CacheService.set(
        CACHE_KEYS.auth.supabaseUser(tokenHash),
        { id: supabaseUserId, email: supabaseEmail },
        CACHE_TTL.AUTH_USER
      );
    }

    const dbUser = await CacheService.getOrSet(
      CACHE_KEYS.auth.dbUser(supabaseUserId),
      async () => {
        const userRepo = AppDataSource.getRepository(User);
        return userRepo.findOne({
          where: { auth_user_id: supabaseUserId },
          relations: ["current_organization"],
        });
      },
      CACHE_TTL.DB_USER
    );

    if (!dbUser || dbUser.deleted_flag) {
      res.status(401).json({
        data: null,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "Authentication required",
        },
      });
      return;
    }
    if (!dbUser.activated_flag) {
      res.status(401).json({
        data: null,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "Your account has been temporarily deactivated. please contact support",
        },
      });
      return;
    }

    if (!dbUser.current_organization) {
      logger.warn({ userId: dbUser.id }, "Auth rejected: user has no current organization");
      res.status(401).json({
        data: null,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: "Authentication required",
        },
      });
      return;
    }

    const currentOrganization = dbUser.current_organization;

    const authReq = req as AuthenticatedRequest;
    authReq.user = {
      id: supabaseUserId,
      email: supabaseEmail,
      app_metadata: appMetadata,
      user_metadata: userMetadata,
    };
    authReq.dbUser = dbUser;
    authReq.currentOrganization = currentOrganization;

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
  next: NextFunction,
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
    const tokenHash = createHash("sha256").update(token).digest("hex").slice(0, 16);

    let supabaseUserId: string | null = null;
    let supabaseEmail = "";

    const cachedAuth = await CacheService.get<{ id: string; email: string }>(
      CACHE_KEYS.auth.supabaseUser(tokenHash)
    );

    if (cachedAuth) {
      supabaseUserId = cachedAuth.id;
      supabaseEmail = cachedAuth.email;
    } else {
      const { data, error } = await supabase.auth.getUser(token);

      if (!error && data.user) {
        supabaseUserId = data.user.id;
        supabaseEmail = data.user.email || "";

        await CacheService.set(
          CACHE_KEYS.auth.supabaseUser(tokenHash),
          { id: supabaseUserId, email: supabaseEmail },
          CACHE_TTL.AUTH_USER
        );
      }
    }

    if (supabaseUserId) {
      const dbUser = await CacheService.getOrSet(
        CACHE_KEYS.auth.dbUser(supabaseUserId),
        async () => {
          const userRepo = AppDataSource.getRepository(User);
          return userRepo.findOne({
            where: { auth_user_id: supabaseUserId! },
            relations: ["current_organization"],
          });
        },
        CACHE_TTL.DB_USER
      );

      if (dbUser && !dbUser.deleted_flag && dbUser.current_organization) {
        const authReq = req as AuthenticatedRequest;
        authReq.user = {
          id: supabaseUserId,
          email: supabaseEmail,
          app_metadata: {},
          user_metadata: {},
        };
        authReq.dbUser = dbUser;
        authReq.currentOrganization = dbUser.current_organization;
      }
    }
  } catch {
    // Silently ignore for optional auth
  }

  next();
}
