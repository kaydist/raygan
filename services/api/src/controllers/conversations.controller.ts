import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../config";
import { ERROR_CODES } from "../constants";
import { ConversationService } from "../services";
import type { ConversationStatus } from "../db/entities/conversation.entity";

const conversationService = new ConversationService();

export async function listConversations(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const { status, page, limit } = req.query;

    const access = await conversationService.checkProjectAccess(
      authReq.dbUser.id,
      projectId,
    );
    if (!access) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    const result = await conversationService.findAllByProjectId(
      access.project.id,
      {
        status: status as ConversationStatus | undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      },
    );

    res.json({
      data: result.items.map((c) => ({
        id: c.uuid,
        role: c.role,
        content: c.content,
        status: c.status,
        model_id: c.model_id,
        tokens_in: c.tokens_in,
        tokens_out: c.tokens_out,
        generation_time_ms: c.generation_time_ms,
        cost_usd: c.cost_usd,
        created_on: c.created_on,
      })),
      error: null,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
      },
    });
  } catch (err) {
    logger.error({ err }, "List conversations failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function getConversation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const conversationId = req.params.conversationId as string;

    const conversation = await conversationService.findByUuid(conversationId);
    if (!conversation) {
      res.status(404).json({
        data: null,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: "Conversation not found",
        },
      });
      return;
    }

    const access = await conversationService.checkAccess(
      authReq.dbUser.id,
      conversation.id,
    );
    if (!access) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    res.json({
      data: {
        id: conversation.uuid,
        role: conversation.role,
        content: conversation.content,
        status: conversation.status,
        model_id: conversation.model_id,
        tokens_in: conversation.tokens_in,
        tokens_out: conversation.tokens_out,
        generation_time_ms: conversation.generation_time_ms,
        cost_usd: conversation.cost_usd,
        ast_diff: conversation.ast_diff,
        created_on: conversation.created_on,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Get conversation failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function createConversation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const projectId = req.params.projectId as string;
    const { content, role } = req.body;

    const access = await conversationService.checkProjectAccess(
      authReq.dbUser.id,
      projectId,
    );
    if (!access) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    const conversation = await conversationService.create(
      { project_id: access.project.id, content, role },
      authReq.dbUser.id,
    );

    res.status(201).json({
      data: {
        id: conversation.uuid,
        role: conversation.role,
        content: conversation.content,
        status: conversation.status,
        created_on: conversation.created_on,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Create conversation failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function updateConversation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const conversationId = req.params.conversationId as string;
    const { content, status } = req.body;

    const conversation = await conversationService.findByUuid(conversationId);
    if (!conversation) {
      res.status(404).json({
        data: null,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: "Conversation not found",
        },
      });
      return;
    }

    const access = await conversationService.checkAccess(
      authReq.dbUser.id,
      conversation.id,
    );
    if (!access) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    const updated = await conversationService.update(
      conversation.id,
      { content, status },
      authReq.dbUser.id,
    );

    res.json({
      data: {
        id: updated?.uuid,
        role: updated?.role,
        content: updated?.content,
        status: updated?.status,
      },
      error: null,
    });
  } catch (err) {
    logger.error({ err }, "Update conversation failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}

export async function deleteConversation(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const conversationId = req.params.conversationId as string;

    const conversation = await conversationService.findByUuid(conversationId);
    if (!conversation) {
      res.status(404).json({
        data: null,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: "Conversation not found",
        },
      });
      return;
    }

    const access = await conversationService.checkAccess(
      authReq.dbUser.id,
      conversation.id,
    );
    if (!access) {
      res.status(403).json({
        data: null,
        error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
      });
      return;
    }

    await conversationService.delete(conversation.id, authReq.dbUser.id);

    res.json({ data: { success: true }, error: null });
  } catch (err) {
    logger.error({ err }, "Delete conversation failed");
    res.status(500).json({
      data: null,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: "An error occurred" },
    });
  }
}
