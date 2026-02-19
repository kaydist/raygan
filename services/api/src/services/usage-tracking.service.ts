import { CreditUsage, AIModel } from "../db";
import { BaseRepository } from "../db/repositories/base.repository";
import { getCostEstimator } from "./ai-gateway/cost-estimator";
import type { GenerateResponse, TokenUsage } from "./ai-gateway/types";
import { logger } from "../config";

interface LogUsageParams {
  organizationId: number;
  userId?: number;
  projectId?: number;
  conversationId?: number;
  model: AIModel;
  eventType: "generation" | "streaming";
  usage: TokenUsage;
  generationTimeMs: number;
  finishReason: string;
  usedFallback?: boolean;
  originalModel?: string;
  metadata?: Record<string, unknown>;
}

interface UsageSummary {
  total_tokens: number;
  total_cost_usd: number;
  generation_count: number;
  models_used: string[];
}

export class UsageTrackingService {
  private creditUsageRepo = new BaseRepository(CreditUsage);
  private costEstimator = getCostEstimator();

  async logUsage(params: LogUsageParams): Promise<CreditUsage> {
    const cost = this.costEstimator.calculateActualCost(params.usage, params.model);

    const event = await this.creditUsageRepo.create({
      organization_id: params.organizationId,
      user_id: params.userId || null,
      project_id: params.projectId || null,
      conversation_id: params.conversationId || null,
      model_id: params.model.id,
      model_name: params.model.model_id,
      provider_slug: params.model.provider?.slug || "unknown",
      event_type: params.eventType,
      input_tokens: params.usage.input_tokens,
      output_tokens: params.usage.output_tokens,
      total_tokens: params.usage.total_tokens,
      cost_usd: cost,
      generation_time_ms: params.generationTimeMs,
      used_fallback: params.usedFallback || false,
      original_model: params.originalModel || null,
      finish_reason: params.finishReason,
      request_metadata: params.metadata || {},
    });

    logger.info(
      {
        organization_id: params.organizationId,
        model: params.model.model_id,
        tokens: params.usage.total_tokens,
        cost_usd: cost,
      },
      "Usage logged",
    );

    return event;
  }

  async logFromResponse(
    response: GenerateResponse,
    model: AIModel,
    context: {
      organizationId: number;
      userId?: number;
      projectId?: number;
      conversationId?: number;
      usedFallback?: boolean;
      originalModel?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<CreditUsage> {
    return this.logUsage({
      organizationId: context.organizationId,
      userId: context.userId,
      projectId: context.projectId,
      conversationId: context.conversationId,
      model,
      eventType: "generation",
      usage: response.usage,
      generationTimeMs: response.generation_time_ms,
      finishReason: response.finish_reason,
      usedFallback: context.usedFallback,
      originalModel: context.originalModel,
      metadata: context.metadata,
    });
  }

  async getOrganizationUsage(
    organizationId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<UsageSummary> {
    const events = await this.creditUsageRepo.findAll({
      where: {
        organization_id: organizationId,
      },
    });

    const filteredEvents = events.filter((e) => {
      const createdOn = new Date(e.created_on);
      return createdOn >= startDate && createdOn <= endDate;
    });

    const modelsUsed = [...new Set(filteredEvents.map((e) => e.model_name))];

    return {
      total_tokens: filteredEvents.reduce((sum, e) => sum + e.total_tokens, 0),
      total_cost_usd: filteredEvents.reduce(
        (sum, e) => sum + Number(e.cost_usd),
        0,
      ),
      generation_count: filteredEvents.length,
      models_used: modelsUsed,
    };
  }

  async getUserUsage(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<UsageSummary> {
    const events = await this.creditUsageRepo.findAll({
      where: {
        user_id: userId,
      },
    });

    const filteredEvents = events.filter((e) => {
      const createdOn = new Date(e.created_on);
      return createdOn >= startDate && createdOn <= endDate;
    });

    const modelsUsed = [...new Set(filteredEvents.map((e) => e.model_name))];

    return {
      total_tokens: filteredEvents.reduce((sum, e) => sum + e.total_tokens, 0),
      total_cost_usd: filteredEvents.reduce(
        (sum, e) => sum + Number(e.cost_usd),
        0,
      ),
      generation_count: filteredEvents.length,
      models_used: modelsUsed,
    };
  }

  async getProjectUsage(projectId: number): Promise<UsageSummary> {
    const events = await this.creditUsageRepo.findAll({
      where: {
        project_id: projectId,
      },
    });

    const modelsUsed = [...new Set(events.map((e) => e.model_name))];

    return {
      total_tokens: events.reduce((sum, e) => sum + e.total_tokens, 0),
      total_cost_usd: events.reduce((sum, e) => sum + Number(e.cost_usd), 0),
      generation_count: events.length,
      models_used: modelsUsed,
    };
  }

  async getConversationUsage(conversationId: number): Promise<UsageSummary> {
    const events = await this.creditUsageRepo.findAll({
      where: {
        conversation_id: conversationId,
      },
    });

    const modelsUsed = [...new Set(events.map((e) => e.model_name))];

    return {
      total_tokens: events.reduce((sum, e) => sum + e.total_tokens, 0),
      total_cost_usd: events.reduce((sum, e) => sum + Number(e.cost_usd), 0),
      generation_count: events.length,
      models_used: modelsUsed,
    };
  }

  async getRecentUsageByModel(
    organizationId: number,
    limit = 10,
  ): Promise<Array<{ model_name: string; count: number; total_tokens: number; total_cost: number }>> {
    const events = await this.creditUsageRepo.findAll({
      where: { organization_id: organizationId },
      order: { created_on: "DESC" },
      take: 1000,
    });

    const modelStats = new Map<string, { count: number; tokens: number; cost: number }>();

    for (const event of events) {
      const existing = modelStats.get(event.model_name) || { count: 0, tokens: 0, cost: 0 };
      modelStats.set(event.model_name, {
        count: existing.count + 1,
        tokens: existing.tokens + event.total_tokens,
        cost: existing.cost + Number(event.cost_usd),
      });
    }

    return Array.from(modelStats.entries())
      .map(([model_name, stats]) => ({
        model_name,
        count: stats.count,
        total_tokens: stats.tokens,
        total_cost: stats.cost,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

let usageTrackingInstance: UsageTrackingService | null = null;

export function getUsageTrackingService(): UsageTrackingService {
  if (!usageTrackingInstance) {
    usageTrackingInstance = new UsageTrackingService();
  }
  return usageTrackingInstance;
}
