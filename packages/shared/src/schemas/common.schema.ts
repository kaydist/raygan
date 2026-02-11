import { z } from 'zod';

// =============================================================================
// COMMON VALIDATORS
// =============================================================================

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email().max(255);

export const slugSchema = z
  .string()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only');

export const positiveIntSchema = z.number().int().positive();

export const nonNegativeIntSchema = z.number().int().nonnegative();

// =============================================================================
// PAGINATION SCHEMA
// =============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// =============================================================================
// ID PARAMS
// =============================================================================

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const uuidParamSchema = z.object({
  uuid: uuidSchema,
});

export type IdParam = z.infer<typeof idParamSchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
