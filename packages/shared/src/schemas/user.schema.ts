import { z } from 'zod';

// =============================================================================
// USER SCHEMAS
// =============================================================================

export const updateUserSchema = z.object({
  first_name: z.string().min(1).max(100).trim().optional(),
  last_name: z.string().min(1).max(100).trim().optional(),
  display_name: z.string().min(1).max(200).trim().optional(),
  avatar_url: z.string().url().nullable().optional(),
});

export const completeOnboardingSchema = z.object({
  organization_name: z.string().min(2).max(255).trim().optional(),
  use_case: z.enum(['personal', 'startup', 'agency', 'enterprise']).optional(),
});

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

export const userQuerySchema = z.object({
  include_organizations: z.coerce.boolean().optional().default(false),
});

// Inferred types
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
