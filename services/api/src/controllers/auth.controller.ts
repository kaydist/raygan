import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { logger, env } from "../config";
import { ERROR_CODES } from "../constants";
import {
  UserService,
  OrganizationService,
  SupabaseAuthService,
  SupabaseUnavailableError,
  SupabaseAuthError,
} from "../services";

const userService = new UserService();
const organizationService = new OrganizationService();
const supabaseAuth = new SupabaseAuthService();

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, first_name, last_name, display_name } = req.body;

    const { user: authUser, session } = await supabaseAuth.signUp(email, password);

    if (!authUser) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: "Registration failed" },
      });
      return;
    }

    const user = await userService.create({
      auth_user_id: authUser.id,
      email,
      first_name,
      last_name,
      display_name: display_name || `${first_name} ${last_name}`,
    });

    const personalOrg = await organizationService.create(
      { name: `${first_name}'s Workspace`, slug: `${user.uuid}-personal`, is_personal: true },
      user.id
    );

    await userService.setCurrentOrganization(user.id, personalOrg.id);

    res.status(201).json({
      data: {
        user: {
          id: user.uuid,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name,
        },
        organization: {
          id: personalOrg.uuid,
          name: personalOrg.name,
          slug: personalOrg.slug,
        },
        current_organization: {
          id: personalOrg.uuid,
          name: personalOrg.name,
          slug: personalOrg.slug,
          plan: personalOrg.plan,
        },
        ...session,
      },
      error: null,
    });
  } catch (err) {
    if (err instanceof SupabaseUnavailableError) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }
    if (err instanceof SupabaseAuthError) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: err.message },
      });
      return;
    }
    logger.error({ err }, "Registration failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const { user: authUser, session } = await supabaseAuth.signInWithPassword(email, password);

    if (!authUser || !session) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Invalid credentials" },
      });
      return;
    }

    const user = await userService.findByAuthIdWithCurrentOrg(authUser.id);
    if (!user || user.deleted_flag) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Invalid credentials" },
      });
      return;
    }

    if (!user.current_organization) {
      logger.warn({ userId: user.id }, "Login attempt for user without organization");
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Invalid credentials" },
      });
      return;
    }

    const organizations = await organizationService.findAllByUserId(user.id);
    const currentOrg = user.current_organization;

    res.json({
      data: {
        user: {
          id: user.uuid,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          onboarding_completed: user.onboarding_completed,
        },
        organizations: organizations.map((org) => ({
          id: org.uuid,
          name: org.name,
          slug: org.slug,
          role: org.role,
        })),
        current_organization: {
          id: currentOrg.uuid,
          name: currentOrg.name,
          slug: currentOrg.slug,
          plan: currentOrg.plan,
        },
        ...session,
      },
      error: null,
    });
  } catch (err) {
    if (err instanceof SupabaseUnavailableError) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }
    if (err instanceof SupabaseAuthError) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Invalid credentials" },
      });
      return;
    }
    logger.error({ err }, "Login failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function oauthLogin(req: Request, res: Response): Promise<void> {
  try {
    const { provider, id_token, access_token, nonce } = req.body;

    const { user: authUser, session } = await supabaseAuth.signInWithIdToken({
      provider,
      token: id_token,
      access_token,
      nonce,
    });

    if (!authUser || !session) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Authentication failed" },
      });
      return;
    }

    let user = await userService.findByAuthIdWithCurrentOrg(authUser.id);
    let isNewUser = false;
    let currentOrg;

    if (!user) {
      isNewUser = true;
      const metadata = authUser.user_metadata || {};
      const email = authUser.email || "";
      const firstName = metadata.full_name?.split(" ")[0] || metadata.name?.split(" ")[0] || "User";
      const lastName = metadata.full_name?.split(" ").slice(1).join(" ") || "";

      user = await userService.create({
        auth_user_id: authUser.id,
        email,
        first_name: firstName,
        last_name: lastName,
        display_name: metadata.full_name || metadata.name || email.split("@")[0],
        avatar_url: metadata.avatar_url || metadata.picture || null,
      });

      currentOrg = await organizationService.create(
        { name: `${firstName}'s Workspace`, slug: `${user.uuid}-personal`, is_personal: true },
        user.id
      );

      await userService.setCurrentOrganization(user.id, currentOrg.id);
    } else {
      if (user.deleted_flag) {
        res.status(401).json({
          data: null,
          error: { code: ERROR_CODES.UNAUTHORIZED, message: "Authentication failed" },
        });
        return;
      }

      if (!user.current_organization) {
        logger.warn({ userId: user.id }, "OAuth login attempt for user without organization");
        res.status(401).json({
          data: null,
          error: { code: ERROR_CODES.UNAUTHORIZED, message: "Authentication failed" },
        });
        return;
      }

      currentOrg = user.current_organization;
    }

    const organizations = await organizationService.findAllByUserId(user.id);

    res.json({
      data: {
        user: {
          id: user.uuid,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          onboarding_completed: user.onboarding_completed,
        },
        organizations: organizations.map((org) => ({
          id: org.uuid,
          name: org.name,
          slug: org.slug,
          role: org.role,
        })),
        current_organization: {
          id: currentOrg.uuid,
          name: currentOrg.name,
          slug: currentOrg.slug,
          plan: currentOrg.plan,
        },
        ...session,
        is_new_user: isNewUser,
      },
      error: null,
    });
  } catch (err) {
    if (err instanceof SupabaseUnavailableError) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }
    if (err instanceof SupabaseAuthError) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Authentication failed" },
      });
      return;
    }
    logger.error({ err }, "OAuth login failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refresh_token } = req.body;

    const { session } = await supabaseAuth.refreshSession(refresh_token);

    if (!session) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Invalid refresh token" },
      });
      return;
    }

    res.json({
      data: session,
      error: null,
    });
  } catch (err) {
    if (err instanceof SupabaseUnavailableError) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }
    if (err instanceof SupabaseAuthError) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Invalid refresh token" },
      });
      return;
    }
    logger.error({ err }, "Token refresh failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  try {
    await supabaseAuth.signOut();
    res.json({ data: { success: true }, error: null });
  } catch (err) {
    if (err instanceof SupabaseUnavailableError) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }
    logger.error({ err }, "Logout failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.dbUser;
    const currentOrganization = authReq.currentOrganization;

    const organizations = await organizationService.findAllByUserId(user.id);

    res.json({
      data: {
        user: {
          id: user.uuid,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          onboarding_completed: user.onboarding_completed,
        },
        organizations: organizations.map((org) => ({
          id: org.uuid,
          name: org.name,
          slug: org.slug,
          role: org.role,
          is_personal: org.is_personal,
        })),
        current_organization: {
          id: currentOrganization.uuid,
          name: currentOrganization.name,
          slug: currentOrganization.slug,
          plan: currentOrganization.plan,
        },
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Get me failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    const redirectTo = `${env.APP_URL || "http://localhost:3000"}/auth/reset-password`;

    await supabaseAuth.resetPasswordForEmail(email, redirectTo);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    if (err instanceof SupabaseUnavailableError) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }
    logger.error({ err }, "Forgot password failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { password } = req.body;

    await supabaseAuth.updateUserPassword(password);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    if (err instanceof SupabaseUnavailableError) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }
    if (err instanceof SupabaseAuthError) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: err.message },
      });
      return;
    }
    logger.error({ err }, "Reset password failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}
