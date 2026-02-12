import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import { UserService } from "../services";

const userService = new UserService();

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

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { first_name, last_name, display_name, avatar_url } = req.body;

    const updated = await userService.update(
      authReq.userId,
      { first_name, last_name, display_name, avatar_url },
      authReq.userId
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

export async function completeOnboarding(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;

    await userService.completeOnboarding(authReq.userId);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Complete onboarding failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;

    await userService.delete(authReq.userId, authReq.userId);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Delete account failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}
