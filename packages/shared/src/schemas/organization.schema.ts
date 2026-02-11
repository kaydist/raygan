import { z } from 'zod';
import { slugSchema, emailSchema, positiveIntSchema } from './common.schema';

// =============================================================================
// ENUMS
// =============================================================================

export const planTierSchema = z.enum(['free', 'starter', 'pro', 'team', 'enterprise']);
export const orgRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);
export const memberStatusSchema = z.enum(['active', 'pending', 'suspended']);

// =============================================================================
// ORGANIZATION SCHEMAS
// =============================================================================

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(255).trim(),
  slug: slugSchema,
  logo_url: z.string().url().nullable().optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(255).trim().optional(),
  slug: slugSchema.optional(),
  logo_url: z.string().url().nullable().optional(),
});

// =============================================================================
// ORGANIZATION MEMBER SCHEMAS
// =============================================================================

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'member', 'viewer']),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

export const transferOwnershipSchema = z.object({
  new_owner_id: positiveIntSchema,
});

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

export const organizationQuerySchema = z.object({
  include_members: z.coerce.boolean().optional().default(false),
  include_projects: z.coerce.boolean().optional().default(false),
});

// Inferred types (PlanTier and OrgRole exported from database.types.ts)
export type MemberStatus = z.infer<typeof memberStatusSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
export type OrganizationQuery = z.infer<typeof organizationQuerySchema>;
