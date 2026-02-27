import { In, Not } from "typeorm";
import { AppDataSource, Project, OrganizationMember, AIModel } from "../db";
import { BaseRepository } from "../db/repositories/base.repository";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../lib";
import type { ProjectStatusType } from "../db/entities/project.entity";

export class ProjectService {
  private projects = new BaseRepository(Project);

  async findById(id: number) {
    return this.projects.findById(id);
  }

  async findByUuid(uuid: string) {
    return CacheService.getOrSet(
      CACHE_KEYS.project.byUuid(uuid),
      () => this.projects.findByUuid(uuid),
      CACHE_TTL.PROJECT_FILES
    );
  }

  async findBySlug(orgId: number, slug: string) {
    return this.projects.findOne({ where: { organization_id: orgId, slug } });
  }

  async findAllByUserId(
    userId: number,
    options?: { orgId?: number; status?: ProjectStatusType },
  ) {
    const memberships = await AppDataSource.getRepository(
      OrganizationMember,
    ).find({
      where: { user_id: userId, deleted_flag: false },
    });

    const orgIds = options?.orgId
      ? [options.orgId]
      : memberships.map((m) => m.organization_id);
    if (orgIds.length === 0) return [];

    const where: Record<string, unknown> = { organization_id: In(orgIds) };
    if (options?.status) {
      where.status = options.status;
    } else {
      where.status = Not("archived");
    }

    return this.projects.findAll({ where, order: { updated_on: "DESC" } });
  }

  async findAllByOrgId(orgId: number, status?: ProjectStatusType) {
    const where: Record<string, unknown> = { organization_id: orgId };
    if (status) {
      where.status = status;
    } else {
      where.status = Not("archived");
    }

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
    createdBy: number,
  ) {
    const defaultAIModel = await AppDataSource.getRepository(AIModel).findOne({
      where: { is_default: true, deleted_flag: false },
    });

    if (!defaultAIModel) {
      return null;
    }

    return this.projects.create(
      { ...data, default_model_id: defaultAIModel.id },
      createdBy,
    );
  }

  async update(id: number, data: Partial<Project>, updatedBy?: number) {
    const result = await this.projects.update(id, data, updatedBy);
    if (result) await CacheService.invalidateProject(result.uuid);
    return result;
  }

  async updateAst(
    id: number,
    astSnapshot: Record<string, unknown>,
    updatedBy?: number,
  ) {
    const result = await this.projects.update(
      id,
      { ast_snapshot: astSnapshot, last_generated_at: new Date() },
      updatedBy,
    );
    if (result) await CacheService.invalidateProject(result.uuid);
    return result;
  }

  async updateFileTree(id: number, fileTree: unknown[], updatedBy?: number) {
    const result = await this.projects.update(id, { file_tree: fileTree }, updatedBy);
    if (result) await CacheService.invalidateProject(result.uuid);
    return result;
  }

  async archive(id: number, updatedBy?: number) {
    const result = await this.projects.update(id, { status: "archived" as ProjectStatusType }, updatedBy);
    if (result) await CacheService.invalidateProject(result.uuid);
    return result;
  }

  async unarchive(id: number, updatedBy?: number) {
    const result = await this.projects.update(id, { status: "draft" as ProjectStatusType }, updatedBy);
    if (result) await CacheService.invalidateProject(result.uuid);
    return result;
  }

  async updateStatus(id: number, status: ProjectStatusType, updatedBy?: number) {
    const result = await this.projects.update(id, { status }, updatedBy);
    if (result) await CacheService.invalidateProject(result.uuid);
    return result;
  }

  async delete(id: number, deletedBy?: number) {
    const project = await this.findById(id);
    const result = await this.projects.softDelete(id, deletedBy);
    if (result && project) await CacheService.invalidateProject(project.uuid);
    return result;
  }

  async checkAccess(
    userId: number,
    projectId: number,
  ): Promise<{ project: Project; role: string } | null> {
    const project = await this.findById(projectId);
    if (!project) return null;

    return this.checkAccessWithProject(userId, project);
  }

  async checkAccessWithProject(
    userId: number,
    project: Project,
  ): Promise<{ project: Project; role: string } | null> {
    const cacheKey = CACHE_KEYS.project.access(userId, project.id);
    const cachedRole = await CacheService.get<string>(cacheKey);

    if (cachedRole) {
      return { project, role: cachedRole };
    }

    const membership = await AppDataSource.getRepository(
      OrganizationMember,
    ).findOne({
      where: {
        organization_id: project.organization_id,
        user_id: userId,
        deleted_flag: false,
      },
    });

    if (!membership) return null;

    await CacheService.set(cacheKey, membership.role, CACHE_TTL.PROJECT_ACCESS);
    return { project, role: membership.role };
  }
}
