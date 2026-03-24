import { AppDataSource, Conversation, OrganizationMember, Project } from "../db";
import { BaseRepository } from "../db/repositories/base.repository";
import { CacheService, CACHE_KEYS, CACHE_TTL } from "../lib";
import type { ConversationStatus } from "../db/entities/conversation.entity";

export class ConversationService {
  private conversations = new BaseRepository(Conversation);

  async findById(id: number) {
    return this.conversations.findById(id);
  }

  async findByUuid(uuid: string) {
    return this.conversations.findByUuid(uuid);
  }

  async findAllByProjectId(
    projectId: number,
    options?: { status?: ConversationStatus; page?: number; limit?: number }
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;

    const where: Record<string, unknown> = { project_id: projectId };
    if (options?.status) where.status = options.status;

    const [items, total] = await Promise.all([
      this.conversations.findAll({
        where,
        order: { created_on: "ASC" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.conversations.count({ where }),
    ]);

    return { items, total, page, limit, hasMore: total > page * limit };
  }

  async create(
    data: { project_id: number; content: string; role?: "user" | "assistant" | "system" },
    createdBy: number
  ) {
    const result = await this.conversations.create(
      { ...data, role: data.role ?? "user", status: "active" as ConversationStatus },
      createdBy
    );
    await CacheService.invalidateConversationHistory(data.project_id);
    return result;
  }

  async createAssistantMessage(
    data: {
      project_id: number;
      content: string;
      model_id?: number;
      tokens_in?: number;
      tokens_out?: number;
      generation_time_ms?: number;
      cost_usd?: number;
      ast_diff?: Record<string, unknown>;
    },
    createdBy: number
  ) {
    const result = await this.conversations.create(
      { ...data, role: "assistant", status: "completed" as ConversationStatus },
      createdBy
    );
    await CacheService.invalidateConversationHistory(data.project_id);
    return result;
  }

  async update(id: number, data: Partial<Conversation>, updatedBy?: number) {
    return this.conversations.update(id, data, updatedBy);
  }

  async markCompleted(id: number, updatedBy?: number) {
    return this.conversations.update(id, { status: "completed" as ConversationStatus }, updatedBy);
  }

  async markError(id: number, updatedBy?: number) {
    return this.conversations.update(id, { status: "error" as ConversationStatus }, updatedBy);
  }

  async delete(id: number, deletedBy?: number) {
    return this.conversations.softDelete(id, deletedBy);
  }

  async checkAccess(userId: number, conversationId: number): Promise<{ conversation: Conversation; role: string } | null> {
    const conversation = await this.findById(conversationId);
    if (!conversation) return null;

    const role = await this.resolveProjectRole(userId, conversation.project_id);
    if (!role) return null;
    return { conversation, role };
  }

  async checkProjectAccess(userId: number, projectId: string): Promise<{ project: Project; role: string } | null> {
    const result = await AppDataSource.getRepository(Project)
      .createQueryBuilder("p")
      .innerJoin(OrganizationMember, "om", "om.organization_id = p.organization_id AND om.user_id = :userId AND om.deleted_flag = false", {
        userId,
      })
      .where("p.uuid = :projectId", { projectId })
      .andWhere("p.deleted_flag = false")
      .select(["p", "om.role"])
      .getRawAndEntities();

    if (!result.entities[0]) return null;

    const project = result.entities[0];
    const role = result.raw[0]?.om_role as string;

    await CacheService.set(
      CACHE_KEYS.project.access(userId, project.id),
      role,
      CACHE_TTL.PROJECT_ACCESS
    );

    return { project, role };
  }

  private async resolveProjectRole(userId: number, projectId: number): Promise<string | null> {
    const cacheKey = CACHE_KEYS.project.access(userId, projectId);
    const cached = await CacheService.get<string>(cacheKey);
    if (cached) return cached;

    const result = await AppDataSource.getRepository(OrganizationMember)
      .createQueryBuilder("om")
      .innerJoin(Project, "p", "p.id = :projectId AND p.organization_id = om.organization_id AND p.deleted_flag = false", {
        projectId,
      })
      .where("om.user_id = :userId", { userId })
      .andWhere("om.deleted_flag = false")
      .select("om.role", "role")
      .getRawOne<{ role: string }>();

    if (!result) return null;

    await CacheService.set(cacheKey, result.role, CACHE_TTL.PROJECT_ACCESS);
    return result.role;
  }
}
