import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import { UserService, OrganizationService } from "../services";

const userService = new UserService();
const organizationService = new OrganizationService();

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.dbUser;

    res.json({
      data: {
        id: user.uuid,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        onboarding_completed: user.onboarding_completed,
        activated_flag: user.activated_flag,
        created_on: user.created_on,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Get profile failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function updateProfile(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { first_name, last_name, display_name, avatar_url } = req.body;

    const updated = await userService.update(
      authReq.dbUser.id,
      { first_name, last_name, display_name, avatar_url },
      authReq.dbUser.id,
    );

    if (!updated) {
      res.status(404).json({
        data: null,
        error: { code: ERROR_CODES.NOT_FOUND, message: "User not found" },
      });
      return;
    }

    res.json({
      data: {
        id: updated.uuid,
        email: updated.email,
        first_name: updated.first_name,
        last_name: updated.last_name,
        display_name: updated.display_name,
        avatar_url: updated.avatar_url,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Update profile failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function completeOnboarding(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;

    await userService.completeOnboarding(authReq.dbUser.id);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Complete onboarding failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function deleteAccount(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;

    await userService.delete(authReq.dbUser.id, authReq.dbUser.id);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Delete account failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function switchOrganization(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { organization_id } = req.body;

    if (!organization_id) {
      res.status(400).json({
        data: null,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: "organization_id is required",
        },
      });
      return;
    }

    const org = await organizationService.findByUuid(organization_id);
    if (!org) {
      logger.error(`User failed to switch to orgainzation ${organization_id}`);
      res.status(404).json({
        data: null,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: "Unable to switch organizations",
        },
      });
      return;
    }

    const membership = await organizationService.getMembership(
      org.id,
      authReq.dbUser.id,
    );
    if (!membership) {
      logger.error(`User is not a member of organization ${organization_id}`);
      res.status(403).json({
        data: null,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: "Unable to switch organizations",
        },
      });
      return;
    }

    await userService.setCurrentOrganization(authReq.dbUser.id, org.id);

    res.json({
      data: {
        current_organization: {
          id: org.uuid,
          name: org.name,
          slug: org.slug,
          plan: org.plan,
        },
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Switch organization failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}
