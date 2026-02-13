import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import { OrganizationService } from "../services";
import type { OrgRole } from "../db/entities/organization-member.entity";

const organizationService = new OrganizationService();

export async function listOrganizations(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;

    const organizations = await organizationService.findAllByUserId(
      authReq.dbUser.id,
    );

    res.json({
      data: organizations.map((org) => ({
        id: org.uuid,
        name: org.name,
        slug: org.slug,
        logo_url: org.logo_url,
        plan: org.plan,
        is_personal: org.is_personal,
        role: org.role,
        joined_at: org.joined_at,
      })),
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "List organizations failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function getOrganization(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { orgId } = req.params;

    const org = await organizationService.findByUuid(orgId);
    if (!org) {
      res.status(404).json({
        data: null,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: "Organization not found",
        },
      });
      return;
    }

    const membership = await organizationService.getMembership(
      org.id,
      authReq.dbUser.id,
    );
    if (!membership) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    res.json({
      data: {
        id: org.uuid,
        name: org.name,
        slug: org.slug,
        logo_url: org.logo_url,
        plan: org.plan,
        is_personal: org.is_personal,
        role: membership.role,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Get organization failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function createOrganization(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, slug, logo_url } = req.body;

    const existing = await organizationService.findBySlug(slug);
    if (existing) {
      res.status(409).json({
        data: null,
        error: {
          code: ERROR_CODES.CONFLICT,
          message: "Organization slug already exists",
        },
      });
      return;
    }

    const org = await organizationService.create(
      { name, slug, logo_url },
      authReq.dbUser.id,
    );

    res.status(201).json({
      data: {
        id: org.uuid,
        name: org.name,
        slug: org.slug,
        logo_url: org.logo_url,
        plan: org.plan,
        is_personal: org.is_personal,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Create organization failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function updateOrganization(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { orgId } = req.params;
    const { name, slug, logo_url } = req.body;

    const org = await organizationService.findByUuid(orgId);
    if (!org) {
      res.status(404).json({
        data: null,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: "Organization not found",
        },
      });
      return;
    }

    const membership = await organizationService.getMembership(
      org.id,
      authReq.dbUser.id,
    );
    if (
      !membership ||
      !organizationService.hasPermission(membership.role, ["owner", "admin"])
    ) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    if (slug && slug !== org.slug) {
      const existing = await organizationService.findBySlug(slug);
      if (existing) {
        res.status(409).json({
          data: null,
          error: {
            code: ERROR_CODES.CONFLICT,
            message: "Organization slug already exists",
          },
        });
        return;
      }
    }

    const updated = await organizationService.update(
      org.id,
      { name, slug, logo_url },
      authReq.dbUser.id,
    );

    res.json({
      data: {
        id: updated?.uuid,
        name: updated?.name,
        slug: updated?.slug,
        logo_url: updated?.logo_url,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Update organization failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function deleteOrganization(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { orgId } = req.params;

    const org = await organizationService.findByUuid(orgId);
    if (!org) {
      res.status(404).json({
        data: null,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: "Organization not found",
        },
      });
      return;
    }

    if (org.is_personal) {
      res.status(400).json({
        data: null,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: "Cannot delete personal workspace",
        },
      });
      return;
    }

    const membership = await organizationService.getMembership(
      org.id,
      authReq.dbUser.id,
    );
    if (!membership || membership.role !== "owner") {
      res.status(403).json({
        data: null,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: "Only owner can delete organization",
        },
      });
      return;
    }

    await organizationService.delete(org.id, authReq.dbUser.id);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Delete organization failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function listMembers(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { orgId } = req.params;

    const org = await organizationService.findByUuid(orgId);
    if (!org) {
      res.status(404).json({
        data: null,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: "Organization not found",
        },
      });
      return;
    }

    const membership = await organizationService.getMembership(
      org.id,
      authReq.dbUser.id,
    );
    if (!membership) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    const members = await organizationService.getMembers(org.id);

    res.json({
      data: members.map((m) => ({
        id: m.user?.uuid,
        email: m.user?.email,
        display_name: m.user?.display_name,
        avatar_url: m.user?.avatar_url,
        role: m.role,
        status: m.status,
        joined_at: m.joined_at,
      })),
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "List members failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function inviteMember(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { orgId } = req.params;
    const { user_id, role } = req.body;

    const org = await organizationService.findByUuid(orgId);
    if (!org) {
      res.status(404).json({
        data: null,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: "Organization not found",
        },
      });
      return;
    }

    const membership = await organizationService.getMembership(
      org.id,
      authReq.dbUser.id,
    );
    if (
      !membership ||
      !organizationService.hasPermission(membership.role, ["owner", "admin"])
    ) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    const existingMembership = await organizationService.getMembership(
      org.id,
      user_id,
    );
    if (existingMembership) {
      res.status(409).json({
        data: null,
        error: {
          code: ERROR_CODES.CONFLICT,
          message: "User is already a member",
        },
      });
      return;
    }

    await organizationService.addMember(
      org.id,
      user_id,
      role as OrgRole,
      authReq.dbUser.id,
    );

    res.status(201).json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Invite member failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function updateMemberRole(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { orgId, memberId } = req.params;
    const { role } = req.body;

    const org = await organizationService.findByUuid(orgId);
    if (!org) {
      res.status(404).json({
        data: null,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: "Organization not found",
        },
      });
      return;
    }

    const membership = await organizationService.getMembership(
      org.id,
      authReq.dbUser.id,
    );
    if (
      !membership ||
      !organizationService.hasPermission(membership.role, ["owner"])
    ) {
      res.status(403).json({
        data: null,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: "Only owner can update roles",
        },
      });
      return;
    }

    const updated = await organizationService.updateMemberRole(
      org.id,
      parseInt(memberId),
      role as OrgRole,
      authReq.dbUser.id,
    );

    if (!updated) {
      res.status(404).json({
        data: null,
        error: { code: ERROR_CODES.NOT_FOUND, message: "Member not found" },
      });
      return;
    }

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Update member role failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { orgId, memberId } = req.params;

    const org = await organizationService.findByUuid(orgId);
    if (!org) {
      res.status(404).json({
        data: null,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: "Organization not found",
        },
      });
      return;
    }

    const membership = await organizationService.getMembership(
      org.id,
      authReq.dbUser.id,
    );
    if (
      !membership ||
      !organizationService.hasPermission(membership.role, ["owner", "admin"])
    ) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    const memberIdNum = parseInt(memberId);
    if (memberIdNum === authReq.dbUser.id) {
      res.status(400).json({
        data: null,
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: "Cannot remove yourself",
        },
      });
      return;
    }

    const removed = await organizationService.removeMember(
      org.id,
      memberIdNum,
      authReq.dbUser.id,
    );
    if (!removed) {
      res.status(404).json({
        data: null,
        error: { code: ERROR_CODES.NOT_FOUND, message: "Member not found" },
      });
      return;
    }

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Remove member failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}
