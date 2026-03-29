import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import {
  ProjectService,
  ProjectSettingsService,
  StoreListingService,
  ReleaseService,
  ReleaseValidationError,
} from "../services";
import type { StoreListingStoreType, ReleaseStoreType, ReleaseTrackType } from "../db/entities";

const projectService = new ProjectService();
const projectSettingsService = new ProjectSettingsService();
const storeListingService = new StoreListingService();
const releaseService = new ReleaseService();

// ── Project Settings (Credentials) ──────────────────────────────────

export async function upsertProjectSetting(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { projectId, category, slug } = req.params;

    const project = await projectService.findByUuid(projectId!);
    if (!project) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" } });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({ data: null, error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" } });
      return;
    }

    const { value, value_type, is_encrypted, visibility, description } = req.body as {
      value: unknown;
      value_type?: "string" | "number" | "boolean" | "json";
      is_encrypted?: boolean;
      visibility?: "private" | "internal";
      description?: string;
    };

    const setting = await projectSettingsService.upsert(
      {
        project_id: project.id,
        organization_id: authReq.currentOrganization.id,
        category: category!,
        slug: slug!,
        value,
        value_type,
        is_encrypted,
        visibility,
        description,
      },
      authReq.dbUser.id,
    );

    res.json({ data: setting, error: null });
  } catch (err) {
    logger.error({ err }, "Upsert project setting failed");
    res.status(500).json({ data: null, error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" } });
  }
}

export async function getProjectSetting(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { projectId, category, slug } = req.params;

    const project = await projectService.findByUuid(projectId!);
    if (!project) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" } });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({ data: null, error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" } });
      return;
    }

    const setting = await projectSettingsService.getBySlug(project.id, category!, slug!);
    if (!setting) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Setting not found" } });
      return;
    }

    res.json({ data: setting, error: null });
  } catch (err) {
    logger.error({ err }, "Get project setting failed");
    res.status(500).json({ data: null, error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" } });
  }
}

export async function getProjectSettingsByCategory(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { projectId, category } = req.params;

    const project = await projectService.findByUuid(projectId!);
    if (!project) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" } });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({ data: null, error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" } });
      return;
    }

    const settings = await projectSettingsService.getByCategory(project.id, category!);

    res.json({ data: settings, error: null });
  } catch (err) {
    logger.error({ err }, "Get project settings by category failed");
    res.status(500).json({ data: null, error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" } });
  }
}

export async function deleteProjectSetting(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { projectId, category, slug } = req.params;

    const project = await projectService.findByUuid(projectId!);
    if (!project) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" } });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({ data: null, error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" } });
      return;
    }

    const deleted = await projectSettingsService.delete(project.id, category!, slug!, authReq.dbUser.id);
    if (!deleted) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Setting not found" } });
      return;
    }

    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Delete project setting failed");
    res.status(500).json({ data: null, error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" } });
  }
}

export async function verifyProjectSetting(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { projectId, category, slug } = req.params;

    const project = await projectService.findByUuid(projectId!);
    if (!project) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" } });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({ data: null, error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" } });
      return;
    }

    // For now, mark as valid if the credential exists and can be decrypted
    const value = await projectSettingsService.getDecryptedValue(project.id, category!, slug!);
    const isValid = value !== null;

    const updated = await projectSettingsService.markValid(project.id, category!, slug!, isValid, authReq.dbUser.id);
    if (!updated) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Setting not found" } });
      return;
    }

    res.json({ data: { is_valid: isValid, last_verified_at: updated.last_verified_at }, error: null });
  } catch (err) {
    logger.error({ err }, "Verify project setting failed");
    res.status(500).json({ data: null, error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" } });
  }
}

// ── Store Listings ──────────────────────────────────────────────────

export async function upsertStoreListing(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { projectId, store } = req.params;

    const project = await projectService.findByUuid(projectId!);
    if (!project) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" } });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({ data: null, error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" } });
      return;
    }

    const {
      title, short_description, full_description, category,
      privacy_policy_url, support_email, screenshots, feature_graphic_url,
    } = req.body as {
      title: string;
      short_description?: string;
      full_description?: string;
      category?: string;
      privacy_policy_url?: string;
      support_email?: string;
      screenshots?: string[];
      feature_graphic_url?: string;
    };

    if (!title) {
      res.status(400).json({ data: null, error: { code: ERROR_CODES.BAD_REQUEST, message: "Title is required" } });
      return;
    }

    const listing = await storeListingService.upsert(
      {
        project_id: project.id,
        organization_id: authReq.currentOrganization.id,
        store: store as StoreListingStoreType,
        title,
        short_description,
        full_description,
        category,
        privacy_policy_url,
        support_email,
        screenshots,
        feature_graphic_url,
      },
      authReq.dbUser.id,
    );

    res.json({ data: listing, error: null });
  } catch (err) {
    logger.error({ err }, "Upsert store listing failed");
    res.status(500).json({ data: null, error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" } });
  }
}

export async function getStoreListing(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { projectId, store } = req.params;

    const project = await projectService.findByUuid(projectId!);
    if (!project) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" } });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({ data: null, error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" } });
      return;
    }

    const listing = await storeListingService.getByProjectAndStore(project.id, store as StoreListingStoreType);
    if (!listing) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Store listing not found" } });
      return;
    }

    res.json({ data: listing, error: null });
  } catch (err) {
    logger.error({ err }, "Get store listing failed");
    res.status(500).json({ data: null, error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" } });
  }
}

// ── Store Releases ──────────────────────────────────────────────────

export async function createStoreRelease(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;

    const project = await projectService.findByUuid(projectId);
    if (!project) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" } });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({ data: null, error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" } });
      return;
    }

    const { build_uuid, store, track } = req.body as {
      build_uuid: string;
      store: ReleaseStoreType;
      track: ReleaseTrackType;
    };

    if (!build_uuid || !store || !track) {
      res.status(400).json({
        data: null,
        error: { code: ERROR_CODES.BAD_REQUEST, message: "build_uuid, store, and track are required" },
      });
      return;
    }

    const release = await releaseService.createRelease(
      project.id,
      authReq.currentOrganization.id,
      build_uuid,
      store,
      track,
      authReq.dbUser.id,
    );

    res.status(201).json({ data: release, error: null });
  } catch (err) {
    if (err instanceof ReleaseValidationError) {
      res.status(400).json({
        data: null,
        error: { code: "RELEASE_VALIDATION_ERROR", message: err.message },
      });
      return;
    }

    logger.error({ err }, "Create store release failed");
    res.status(500).json({ data: null, error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" } });
  }
}

export async function listStoreReleases(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;

    const project = await projectService.findByUuid(projectId);
    if (!project) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" } });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({ data: null, error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" } });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const { releases, total } = await releaseService.listReleases(project.id, page, limit);

    res.json({ data: releases, error: null, meta: { total, page, limit } });
  } catch (err) {
    logger.error({ err }, "List store releases failed");
    res.status(500).json({ data: null, error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" } });
  }
}

export async function getStoreRelease(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { projectId, releaseId } = req.params;

    const project = await projectService.findByUuid(projectId!);
    if (!project) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" } });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({ data: null, error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" } });
      return;
    }

    const release = await releaseService.getRelease(releaseId!);
    if (!release || release.project_id !== project.id) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Release not found" } });
      return;
    }

    res.json({ data: release, error: null });
  } catch (err) {
    logger.error({ err }, "Get store release failed");
    res.status(500).json({ data: null, error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" } });
  }
}

export async function cancelStoreRelease(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { projectId, releaseId } = req.params;

    const project = await projectService.findByUuid(projectId!);
    if (!project) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Project not found" } });
      return;
    }

    const access = await projectService.checkAccess(authReq.dbUser.id, project.id);
    if (!access) {
      res.status(403).json({ data: null, error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" } });
      return;
    }

    const release = await releaseService.cancelRelease(releaseId!, authReq.dbUser.id);
    if (!release || release.project_id !== project.id) {
      res.status(404).json({ data: null, error: { code: ERROR_CODES.NOT_FOUND, message: "Release not found" } });
      return;
    }

    res.json({ data: release, error: null });
  } catch (err) {
    logger.error({ err }, "Cancel store release failed");
    res.status(500).json({ data: null, error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" } });
  }
}
