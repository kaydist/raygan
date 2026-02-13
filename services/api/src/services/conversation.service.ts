import { AppDataSource, Conversation, OrganizationMember, Project } from "../db";
import { BaseRepository } from "../db/repositories/base.repository";
import type { ConversationStatus } from "../db/entities/conversation.entity";

export class ConversationService {
  private conversations = new BaseRepository(Conversation);
  private projects = new BaseRepository(Project);

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
    return this.conversations.create(
      { ...data, role: data.role ?? "user", status: "active" as ConversationStatus },
      createdBy
    );
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
    return this.conversations.create(
      { ...data, role: "assistant", status: "completed" as ConversationStatus },
      createdBy
    );
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

    const project = await this.projects.findById(conversation.project_id);
    if (!project) return null;

    const membership = await AppDataSource.getRepository(OrganizationMember).findOne({
      where: { organization_id: project.organization_id, user_id: userId, deleted_flag: false },
    });

    if (!membership) return null;
    return { conversation, role: membership.role };
  }

  async checkProjectAccess(userId: number, projectId: string): Promise<{ project: Project; role: string } | null> {
    const project = await this.projects.findByUuid(projectId);
    if (!project) return null;

    const membership = await AppDataSource.getRepository(OrganizationMember).findOne({
      where: { organization_id: project.organization_id, user_id: userId, deleted_flag: false },
    });

    if (!membership) return null;
    return { project, role: membership.role };
  }
}
