import { z } from 'zod';
import { slugSchema, positiveIntSchema } from './common.schema';

// =============================================================================
// ENUMS
// =============================================================================

export const backendProviderSchema = z.enum(['supabase', 'firebase', 'appwrite', 'custom']);
export const frameworkVersionSchema = z.enum(['expo-52', 'expo-51', 'expo-50']);
export const projectStatusSchema = z.enum(['draft', 'deployed', 'archived']);

// =============================================================================
// PROJECT SCHEMAS
// =============================================================================

export const createProjectSchema = z.object({
  organization_id: positiveIntSchema,
  name: z.string().min(2).max(255).trim(),
  slug: slugSchema,
  description: z.string().max(1000).nullable().optional(),
  framework_version: frameworkVersionSchema.optional().default('expo-52'),
  backend_provider: backendProviderSchema.nullable().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(255).trim().optional(),
  slug: slugSchema.optional(),
  description: z.string().max(1000).nullable().optional(),
  framework_version: frameworkVersionSchema.optional(),
  settings: z.record(z.unknown()).optional(),
  backend_provider: backendProviderSchema.nullable().optional(),
  backend_config: z.string().nullable().optional(),
  default_model_id: positiveIntSchema.nullable().optional(),
  status: projectStatusSchema.optional(),
});

export const updateAstSnapshotSchema = z.object({
  ast_snapshot: z.record(z.unknown()),
  version: positiveIntSchema,
});

export const updateFileTreeSchema = z.object({
  file_tree: z.array(z.unknown()),
});

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

export const projectQuerySchema = z.object({
  organization_id: z.coerce.number().int().positive().optional(),
  status: projectStatusSchema.optional(),
  include_ast: z.coerce.boolean().optional().default(false),
  include_files: z.coerce.boolean().optional().default(false),
});

export const projectListQuerySchema = z.object({
  organization_id: z.coerce.number().int().positive().optional(),
  status: projectStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Inferred types
export type BackendProvider = z.infer<typeof backendProviderSchema>;
export type FrameworkVersion = z.infer<typeof frameworkVersionSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type UpdateAstSnapshotInput = z.infer<typeof updateAstSnapshotSchema>;
export type UpdateFileTreeInput = z.infer<typeof updateFileTreeSchema>;
export type ProjectQuery = z.infer<typeof projectQuerySchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
