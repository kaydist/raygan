import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import { ProjectService, BuildService, BuildLimitExceededError } from "../services";
import type { BuildPlatformType, BuildProfileType, BuildDistributionType } from "../db/entities";

const projectService = new ProjectService();
const buildService = new BuildService();

export async function triggerBuild(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;

    const project = await projectService.findByUuid(projectId);
    if (!project) {
      res.status(404).json({
        data: null,
        error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" },
      });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    const { platform, profile, distribution } = req.body as {
      platform: BuildPlatformType;
      profile?: BuildProfileType;
      distribution?: BuildDistributionType;
    };

    if (platform !== "android") {
      res.status(400).json({
        data: null,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: "Only Android builds are currently supported",
        },
      });
      return;
    }

    const build = await buildService.triggerBuild(
      project.id,
      authReq.currentOrganization.id,
      authReq.dbUser.id,
      platform,
      profile || "preview",
      distribution || "internal",
    );

    res.status(201).json({ data: build, error: null });
  } catch (err) {
    if (err instanceof BuildLimitExceededError) {
      res.status(429).json({
        data: null,
        error: { code: "BUILD_LIMIT_EXCEEDED", message: err.message },
      });
      return;
    }

    logger.error({ err }, "Trigger build failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function listBuilds(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;

    const project = await projectService.findByUuid(projectId);
    if (!project) {
      res.status(404).json({
        data: null,
        error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" },
      });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { builds, total } = await buildService.listBuilds(project.id, page, limit);

    res.json({
      data: builds,
      error: null,
      meta: { total, page, limit },
    });
  } catch (err) {
    logger.error({ err }, "List builds failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function getBuild(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const buildId = req.params.buildId as string;

    const project = await projectService.findByUuid(projectId);
    if (!project) {
      res.status(404).json({
        data: null,
        error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" },
      });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    const build = await buildService.getBuild(buildId);
    if (!build || build.project_id !== project.id) {
      res.status(404).json({
        data: null,
        error: { code: "BUILD_NOT_FOUND", message: "Build not found" },
      });
      return;
    }

    res.json({ data: build, error: null });
  } catch (err) {
    logger.error({ err }, "Get build failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function cancelBuild(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const buildId = req.params.buildId as string;

    const project = await projectService.findByUuid(projectId);
    if (!project) {
      res.status(404).json({
        data: null,
        error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" },
      });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    const build = await buildService.cancelBuild(buildId, authReq.dbUser.id);
    if (!build || build.project_id !== project.id) {
      res.status(404).json({
        data: null,
        error: { code: "BUILD_NOT_FOUND", message: "Build not found" },
      });
      return;
    }

    res.json({ data: build, error: null });
  } catch (err) {
    logger.error({ err }, "Cancel build failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function handleEASWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers["expo-signature"] as string;
    if (!signature) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: "Missing signature header" },
      });
      return;
    }

    const rawBody = req.body as Buffer;

    await buildService.handleWebhook(signature, rawBody);

    res.status(200).json({ data: { received: true }, error: null });
  } catch (err) {
    logger.error({ err }, "EAS webhook handling failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "Webhook processing failed" },
    });
  }
}
