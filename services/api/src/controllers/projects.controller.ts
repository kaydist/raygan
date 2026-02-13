import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import { ProjectService, OrganizationService } from "../services";

const projectService = new ProjectService();
const organizationService = new OrganizationService();

export async function listProjects(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const currentOrg = authReq.currentOrganization;

    const projects = await projectService.findAllByOrgId(currentOrg.id);

    res.json({
      data: projects.map((p) => ({
        id: p.uuid,
        name: p.name,
        slug: p.slug,
        description: p.description,
        framework_version: p.framework_version,
        backend_provider: p.backend_provider,
        is_archived: p.is_archived,
        last_generated_at: p.last_generated_at,
        updated_on: p.updated_on,
        created_on: p.created_on,
      })),
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "List projects failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function getProject(req: Request, res: Response): Promise<void> {
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

    res.json({
      data: {
        id: project.uuid,
        name: project.name,
        slug: project.slug,
        description: project.description,
        framework_version: project.framework_version,
        backend_provider: project.backend_provider,
        ast_snapshot: project.ast_snapshot,
        file_tree: project.file_tree,
        is_archived: project.is_archived,
        last_generated_at: project.last_generated_at,
        updated_on: project.updated_on,
        created_on: project.created_on,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Get project failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function createProject(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const currentOrg = authReq.currentOrganization;
    const { name, slug, description, framework_version, backend_provider } = req.body;

    const existing = await projectService.findBySlug(currentOrg.id, slug);
    if (existing) {
      res.status(409).json({
        data: null,
        error: { code: ERROR_CODES.CONFLICT, message: "Project slug already exists in this organization" },
      });
      return;
    }

    const project = await projectService.create(
      {
        organization_id: currentOrg.id,
        name,
        slug,
        description,
        framework_version,
        backend_provider,
      },
      authReq.dbUser.id,
    );

    res.status(201).json({
      data: {
        id: project.uuid,
        name: project.name,
        slug: project.slug,
        description: project.description,
        framework_version: project.framework_version,
        backend_provider: project.backend_provider,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Create project failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const { name, slug, description, framework_version, backend_provider } = req.body;

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

    if (slug && slug !== project.slug) {
      const existing = await projectService.findBySlug(project.organization_id, slug);
      if (existing) {
        res.status(409).json({
          data: null,
          error: { code: ERROR_CODES.CONFLICT, message: "Project slug already exists in this organization" },
        });
        return;
      }
    }

    const updated = await projectService.update(
      project.id,
      { name, slug, description, framework_version, backend_provider },
      authReq.dbUser.id,
    );

    res.json({
      data: {
        id: updated?.uuid,
        name: updated?.name,
        slug: updated?.slug,
        description: updated?.description,
        framework_version: updated?.framework_version,
        backend_provider: updated?.backend_provider,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Update project failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function archiveProject(req: Request, res: Response): Promise<void> {
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

    await projectService.archive(project.id, authReq.dbUser.id);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Archive project failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function unarchiveProject(req: Request, res: Response): Promise<void> {
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

    await projectService.unarchive(project.id, authReq.dbUser.id);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Unarchive project failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
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

    const membership = await organizationService.getMembership(project.organization_id, authReq.dbUser.id);
    if (!membership || !organizationService.hasPermission(membership.role, ["owner", "admin"])) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    await projectService.delete(project.id, authReq.dbUser.id);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Delete project failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function updateAst(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const { ast_snapshot } = req.body;

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

    await projectService.updateAst(project.id, ast_snapshot, authReq.dbUser.id);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Update AST failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function updateFileTree(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const { file_tree } = req.body;

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

    await projectService.updateFileTree(project.id, file_tree, authReq.dbUser.id);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Update file tree failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}
