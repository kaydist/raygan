/**
 * Database types generated from Supabase migrations
 * These types match the database schema exactly with snake_case properties
 */

// =============================================================================
// ENUM TYPES
// =============================================================================

export type PlanTier = 'free' | 'starter' | 'pro' | 'team' | 'enterprise';

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export type ProjectStatus = 'active' | 'deactivated' | 'archived' | 'deleted';

export type ConversationStatus = 'active' | 'completed' | 'error';

export type MessageRole = 'user' | 'assistant' | 'system';

export type AiProvider = 'anthropic' | 'openai' | 'xai' | 'google' | 'mistral' | 'deepseek';

// =============================================================================
// BASE ENTITY
// =============================================================================

export interface BaseEntity {
  id: number;
  uuid: string;
  meta: Record<string, unknown>;
  created_on: string;
  created_by: number | null;
  updated_on: string;
  updated_by: number | null;
  deleted_flag: boolean;
  deleted_on: string | null;
  deleted_by: number | null;
}

// =============================================================================
// ORGANIZATIONS
// =============================================================================

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  logo_url: string | null;
  plan: PlanTier;
  is_personal: boolean;
}

export interface OrganizationInsert {
  name: string;
  slug: string;
  logo_url?: string | null;
  plan?: PlanTier;
  is_personal?: boolean;
  meta?: Record<string, unknown>;
  created_by?: number | null;
}

export interface OrganizationUpdate {
  name?: string;
  slug?: string;
  logo_url?: string | null;
  plan?: PlanTier;
  is_personal?: boolean;
  meta?: Record<string, unknown>;
  updated_by?: number | null;
}

// =============================================================================
// USERS
// =============================================================================

export interface User extends BaseEntity {
  auth_user_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  activated_flag: boolean;
  activated_on: string | null;
  activated_by: number | null;
  onboarding_completed: boolean;
}

export interface UserInsert {
  auth_user_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  avatar_url?: string | null;
  activated_flag?: boolean;
  activated_on?: string | null;
  activated_by?: number | null;
  onboarding_completed?: boolean;
  meta?: Record<string, unknown>;
  created_by?: number | null;
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  email?: string;
  avatar_url?: string | null;
  activated_flag?: boolean;
  activated_on?: string | null;
  activated_by?: number | null;
  onboarding_completed?: boolean;
  meta?: Record<string, unknown>;
  updated_by?: number | null;
}

// =============================================================================
// ORGANIZATION MEMBERS
// =============================================================================

export interface OrganizationMember extends BaseEntity {
  organization_id: number;
  user_id: number;
  role: OrgRole;
  invited_by: number | null;
  invited_at: string | null;
  joined_at: string | null;
  status: string;
}

export interface OrganizationMemberInsert {
  organization_id: number;
  user_id: number;
  role?: OrgRole;
  invited_by?: number | null;
  invited_at?: string | null;
  joined_at?: string | null;
  status?: string;
  meta?: Record<string, unknown>;
  created_by?: number | null;
}

export interface OrganizationMemberUpdate {
  role?: OrgRole;
  invited_by?: number | null;
  invited_at?: string | null;
  joined_at?: string | null;
  status?: string;
  meta?: Record<string, unknown>;
  updated_by?: number | null;
}

// =============================================================================
// PROJECTS
// =============================================================================

export interface Project extends BaseEntity {
  organization_id: number;
  name: string;
  description: string | null;
  slug: string;
  framework_version: string;
  ast_snapshot: Record<string, unknown>;
  file_tree: unknown[];
  settings: Record<string, unknown>;
  backend_provider: string | null;
  backend_config: string | null;
  default_model_id: number | null;
  last_generated_at: string | null;
  is_archived: boolean;
}

export interface ProjectInsert {
  organization_id: number;
  name: string;
  description?: string | null;
  slug: string;
  framework_version?: string;
  ast_snapshot?: Record<string, unknown>;
  file_tree?: unknown[];
  settings?: Record<string, unknown>;
  backend_provider?: string | null;
  backend_config?: string | null;
  default_model_id?: number | null;
  last_generated_at?: string | null;
  is_archived?: boolean;
  meta?: Record<string, unknown>;
  created_by?: number | null;
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  slug?: string;
  framework_version?: string;
  ast_snapshot?: Record<string, unknown>;
  file_tree?: unknown[];
  settings?: Record<string, unknown>;
  backend_provider?: string | null;
  backend_config?: string | null;
  default_model_id?: number | null;
  last_generated_at?: string | null;
  is_archived?: boolean;
  meta?: Record<string, unknown>;
  updated_by?: number | null;
}

// =============================================================================
// CONVERSATIONS
// =============================================================================

export interface Conversation extends BaseEntity {
  project_id: number;
  role: MessageRole;
  content: string;
  model_id: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  generation_time_ms: number | null;
  cost_usd: number | null;
  ast_diff: Record<string, unknown> | null;
  status: ConversationStatus;
}

export interface ConversationInsert {
  project_id: number;
  role: MessageRole;
  content: string;
  model_id?: number | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  generation_time_ms?: number | null;
  cost_usd?: number | null;
  ast_diff?: Record<string, unknown> | null;
  status?: ConversationStatus;
  meta?: Record<string, unknown>;
  created_by?: number | null;
}

export interface ConversationUpdate {
  content?: string;
  model_id?: number | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  generation_time_ms?: number | null;
  cost_usd?: number | null;
  ast_diff?: Record<string, unknown> | null;
  status?: ConversationStatus;
  meta?: Record<string, unknown>;
  updated_by?: number | null;
}
