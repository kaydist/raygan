import { In } from "typeorm";
import { AppDataSource, Project, OrganizationMember } from "../db";
import { BaseRepository } from "../db/repositories/base.repository";

export class ProjectService {
  private projects = new BaseRepository(Project);

  async findById(id: number) {
    return this.projects.findById(id);
  }

  async findByUuid(uuid: string) {
    return this.projects.findByUuid(uuid);
  }

  async findBySlug(orgId: number, slug: string) {
    return this.projects.findOne({ where: { organization_id: orgId, slug } });
  }

  async findAllByUserId(userId: number, options?: { orgId?: number; includeArchived?: boolean }) {
    const memberships = await AppDataSource.getRepository(OrganizationMember).find({
      where: { user_id: userId, deleted_flag: false },
    });

    const orgIds = options?.orgId ? [options.orgId] : memberships.map((m) => m.organization_id);
    if (orgIds.length === 0) return [];

    const where: Record<string, unknown> = { organization_id: In(orgIds) };
    if (!options?.includeArchived) where.is_archived = false;

    return this.projects.findAll({ where, order: { updated_on: "DESC" } });
  }

  async findAllByOrgId(orgId: number, includeArchived = false) {
    const where: Record<string, unknown> = { organization_id: orgId };
    if (!includeArchived) where.is_archived = false;

    return this.projects.findAll({ where, order: { updated_on: "DESC" } });
  }

  async create(
    data: {
      organization_id: number;
      name: string;
      slug: string;
      description?: string | null;
      framework_version?: string;
      backend_provider?: string | null;
    },
    createdBy: number
  ) {
    return this.projects.create(data, createdBy);
  }

  async update(id: number, data: Partial<Project>, updatedBy?: number) {
    return this.projects.update(id, data, updatedBy);
  }

  async updateAst(id: number, astSnapshot: Record<string, unknown>, updatedBy?: number) {
    return this.projects.update(id, { ast_snapshot: astSnapshot, last_generated_at: new Date() }, updatedBy);
  }

  async updateFileTree(id: number, fileTree: unknown[], updatedBy?: number) {
    return this.projects.update(id, { file_tree: fileTree }, updatedBy);
  }

  async archive(id: number, updatedBy?: number) {
    return this.projects.update(id, { is_archived: true }, updatedBy);
  }

  async unarchive(id: number, updatedBy?: number) {
    return this.projects.update(id, { is_archived: false }, updatedBy);
  }

  async delete(id: number, deletedBy?: number) {
    return this.projects.softDelete(id, deletedBy);
  }

  async checkAccess(userId: number, projectId: number): Promise<{ project: Project; role: string } | null> {
    const project = await this.findById(projectId);
    if (!project) return null;

    const membership = await AppDataSource.getRepository(OrganizationMember).findOne({
      where: { organization_id: project.organization_id, user_id: userId, deleted_flag: false },
    });

    if (!membership) return null;
    return { project, role: membership.role };
  }
}
