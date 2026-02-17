import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import { ProjectService, FileStorageService } from "../services";

const projectService = new ProjectService();
const fileStorageService = new FileStorageService();

export async function listFiles(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const format = req.query.format as string | undefined;

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

    if (format === "snack") {
      const snackFiles = await fileStorageService.getSnackFiles(project.id);
      res.json({
        data: snackFiles,
        error: null,
      });
      return;
    }

    if (format === "tree") {
      const fileTree = await fileStorageService.getFileTree(project.id);
      res.json({
        data: fileTree,
        error: null,
      });
      return;
    }

    const files = await fileStorageService.getFilesForFrontend(project.id);
    res.json({
      data: files,
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "List files failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function getFile(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const fileId = req.params.fileId as string;

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

    const file = await fileStorageService.findByUuid(fileId);
    if (!file || file.project_id !== project.id) {
      res.status(404).json({
        data: null,
        error: { code: ERROR_CODES.NOT_FOUND, message: "File not found" },
      });
      return;
    }

    res.json({
      data: {
        uuid: file.uuid,
        path: file.path,
        name: file.name,
        type: file.is_directory ? "directory" : "file",
        content: file.content,
        language: file.language,
        size_bytes: file.size_bytes,
        version: file.version,
        updated_on: file.updated_on,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Get file failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function getFileByPath(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const filePath = req.query.path as string;

    if (!filePath) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: "Path query parameter is required" },
      });
      return;
    }

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

    const file = await fileStorageService.findByPath(project.id, filePath);
    if (!file) {
      res.status(404).json({
        data: null,
        error: { code: ERROR_CODES.NOT_FOUND, message: "File not found" },
      });
      return;
    }

    res.json({
      data: {
        uuid: file.uuid,
        path: file.path,
        name: file.name,
        type: file.is_directory ? "directory" : "file",
        content: file.content,
        language: file.language,
        size_bytes: file.size_bytes,
        version: file.version,
        updated_on: file.updated_on,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Get file by path failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function createFile(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const { path, content, language } = req.body;

    if (!path || content === undefined) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: "Path and content are required" },
      });
      return;
    }

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

    const file = await fileStorageService.createOrUpdate({
      project_id: project.id,
      path,
      content,
      language,
    }, authReq.dbUser.id);

    res.status(201).json({
      data: {
        uuid: file.uuid,
        path: file.path,
        name: file.name,
        type: file.is_directory ? "directory" : "file",
        language: file.language,
        size_bytes: file.size_bytes,
        version: file.version,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Create file failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function updateFile(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const fileId = req.params.fileId as string;
    const { content, language } = req.body;

    if (content === undefined) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: "Content is required" },
      });
      return;
    }

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

    const existingFile = await fileStorageService.findByUuid(fileId);
    if (!existingFile || existingFile.project_id !== project.id) {
      res.status(404).json({
        data: null,
        error: { code: ERROR_CODES.NOT_FOUND, message: "File not found" },
      });
      return;
    }

    const file = await fileStorageService.update(existingFile.id, {
      content,
      language,
    }, authReq.dbUser.id);

    res.json({
      data: {
        uuid: file.uuid,
        path: file.path,
        name: file.name,
        type: file.is_directory ? "directory" : "file",
        language: file.language,
        size_bytes: file.size_bytes,
        version: file.version,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Update file failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function deleteFile(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const fileId = req.params.fileId as string;

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

    const existingFile = await fileStorageService.findByUuid(fileId);
    if (!existingFile || existingFile.project_id !== project.id) {
      res.status(404).json({
        data: null,
        error: { code: ERROR_CODES.NOT_FOUND, message: "File not found" },
      });
      return;
    }

    await fileStorageService.delete(existingFile.id, authReq.dbUser.id);

    res.json({
      data: { success: true },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Delete file failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function bulkCreateFiles(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const { files } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: "Files array is required" },
      });
      return;
    }

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

    const createdFiles = await fileStorageService.bulkCreateOrUpdate(
      project.id,
      files,
      authReq.dbUser.id
    );

    res.status(201).json({
      data: createdFiles.map(f => ({
        uuid: f.uuid,
        path: f.path,
        name: f.name,
        type: f.is_directory ? "directory" : "file",
        language: f.language,
        size_bytes: f.size_bytes,
        version: f.version,
      })),
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Bulk create files failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}
