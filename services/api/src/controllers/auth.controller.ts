import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseClient } from "../config/supabase";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import { UserService, OrganizationService } from "../services";

const userService = new UserService();
const organizationService = new OrganizationService();

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, first_name, last_name, display_name } = req.body;

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: authError?.message || "Registration failed" },
      });
      return;
    }

    const user = await userService.create({
      auth_user_id: authData.user.id,
      email,
      first_name,
      last_name,
      display_name: display_name || `${first_name} ${last_name}`,
    });

    const personalOrg = await organizationService.create(
      { name: `${first_name}'s Workspace`, slug: `${user.uuid}-personal`, is_personal: true },
      user.id
    );

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
        session: authData.session,
      },
      error: null,
    });
  } catch (err) {
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

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Invalid credentials" },
      });
      return;
    }

    const user = await userService.findByAuthId(data.user.id);
    if (!user || user.deleted_flag) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Invalid credentials" },
      });
      return;
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
        session: data.session,
      },
      error: null,
    });
  } catch (err) {
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

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider,
      token: id_token,
      access_token,
      nonce,
    });

    if (error || !data.user) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Authentication failed" },
      });
      return;
    }

    let user = await userService.findByAuthId(data.user.id);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const metadata = data.user.user_metadata || {};
      const email = data.user.email || "";
      const firstName = metadata.full_name?.split(" ")[0] || metadata.name?.split(" ")[0] || "User";
      const lastName = metadata.full_name?.split(" ").slice(1).join(" ") || "";

      user = await userService.create({
        auth_user_id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        display_name: metadata.full_name || metadata.name || email.split("@")[0],
        avatar_url: metadata.avatar_url || metadata.picture || null,
      });

      await organizationService.create(
        { name: `${firstName}'s Workspace`, slug: `${user.uuid}-personal`, is_personal: true },
        user.id
      );
    }

    if (user.deleted_flag) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Authentication failed" },
      });
      return;
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
        session: data.session,
        isNewUser,
      },
      error: null,
    });
  } catch (err) {
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

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error || !data.session) {
      res.status(401).json({
        data: null,
        error: { code: ERROR_CODES.UNAUTHORIZED, message: "Invalid refresh token" },
      });
      return;
    }

    res.json({ data: { session: data.session }, error: null });
  } catch (err) {
    logger.error({ err }, "Token refresh failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }

    await supabase.auth.signOut();

    res.json({ data: { success: true }, error: null });
  } catch (err) {
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

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }

    const redirectTo = `${process.env.APP_URL || "http://localhost:3000"}/auth/reset-password`;

    await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    res.json({ data: { success: true }, error: null });
  } catch (err) {
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

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.status(503).json({
        data: null,
        error: { code: ERROR_CODES.SERVICE_UNAVAILABLE, message: "Service temporarily unavailable" },
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: error.message },
      });
      return;
    }

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Reset password failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}
