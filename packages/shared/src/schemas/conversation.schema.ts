import { z } from 'zod';
import { positiveIntSchema } from './common.schema';

// =============================================================================
// ENUMS
// =============================================================================

export const messageRoleSchema = z.enum(['user', 'assistant', 'system']);
export const conversationStatusSchema = z.enum(['active', 'completed', 'error']);

// =============================================================================
// CONVERSATION SCHEMAS
// =============================================================================

export const createConversationSchema = z.object({
  project_id: positiveIntSchema,
  content: z.string().min(1).max(50000).trim(),
});

export const updateConversationSchema = z.object({
  status: conversationStatusSchema.optional(),
  tokens_in: z.number().int().nonnegative().optional(),
  tokens_out: z.number().int().nonnegative().optional(),
  generation_time_ms: z.number().int().nonnegative().optional(),
  cost_usd: z.number().nonnegative().optional(),
  ast_diff: z.record(z.unknown()).nullable().optional(),
});

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

export const conversationQuerySchema = z.object({
  project_id: z.coerce.number().int().positive(),
  status: conversationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Inferred types (MessageRole and ConversationStatus exported from database.types.ts)
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type ConversationQuery = z.infer<typeof conversationQuerySchema>;
