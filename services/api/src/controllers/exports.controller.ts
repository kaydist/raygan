import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import { ProjectService, ExportService } from "../services";

const projectService = new ProjectService();
const exportService = new ExportService();

export async function exportProjectZip(req: Request, res: Response): Promise<void> {
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

    const includeBackendSDK = req.query.includeBackendSDK === "true";

    const { stream, filename, fileCount } = await exportService.exportProject(project.id, {
      includeBackendSDK,
    });

    logger.info({
      projectId: project.id,
      projectSlug: project.slug,
      userId: authReq.dbUser.id,
      fileCount,
    }, "Project exported as ZIP");

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    stream.pipe(res);

    stream.on("error", (err) => {
      logger.error({ err, projectId: project.id }, "Export stream error");
      if (!res.headersSent) {
        res.status(500).json({
          data: null,
          error: { code: ERROR_CODES.INTERNAL_ERROR, message: "Export failed" },
        });
      }
    });
  } catch (err) {
    logger.error({ err }, "Export project failed");
    if (!res.headersSent) {
      res.status(500).json({
        data: null,
        error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
      });
    }
  }
}
