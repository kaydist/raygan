/**
 * API request/response types
 * These types are used for HTTP communication between frontend and backend
 */

// =============================================================================
// API ENVELOPE
// =============================================================================

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  total?: number;
  page?: number;
  limit?: number;
  has_more?: boolean;
}

// =============================================================================
// PAGINATION
// =============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// =============================================================================
// AUTH TYPES
// =============================================================================

export interface AuthUser {
  id: number;
  uuid: string;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url: string | null;
  activated_flag: boolean;
  onboarding_completed: boolean;
}

export interface AuthContext {
  user: AuthUser;
  organization_role?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: "Bearer";
}

export interface AuthResponse extends TokenResponse {
  user: AuthUser;
}

export interface GoogleOAuthRequest {
  id_token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// =============================================================================
// ORGANIZATION API TYPES
// =============================================================================

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  logo_url?: string | null;
}

export interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
  logo_url?: string | null;
}

export interface OrganizationResponse {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: string;
  is_personal: boolean;
  member_count?: number;
  created_on: string;
}

export interface OrganizationWithRole extends OrganizationResponse {
  role: string;
  joined_at: string | null;
}

// =============================================================================
// ORGANIZATION MEMBER API TYPES
// =============================================================================

export interface InviteMemberRequest {
  email: string;
  role: "admin" | "member" | "viewer";
}

export interface UpdateMemberRoleRequest {
  role: "admin" | "member" | "viewer";
}

export interface OrganizationMemberResponse {
  id: number;
  user_id: number;
  role: string;
  status: string;
  joined_at: string | null;
  invited_at: string | null;
  user: {
    id: number;
    uuid: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
  };
}

// =============================================================================
// USER API TYPES
// =============================================================================

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string | null;
}

export interface UserProfileResponse {
  id: number;
  uuid: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url: string | null;
  activated_flag: boolean;
  onboarding_completed: boolean;
  organizations: OrganizationWithRole[];
  created_on: string;
}

export interface CompleteOnboardingRequest {
  organization_name?: string;
  use_case?: string;
}

// =============================================================================
// PROJECT API TYPES
// =============================================================================

export interface CreateProjectRequest {
  name: string;
  description?: string | null;
  slug: string;
  framework_version?: string;
  backend_provider?: string | null;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string | null;
  slug?: string;
  framework_version?: string;
  settings?: Record<string, unknown>;
  backend_provider?: string | null;
  backend_config?: string | null;
  default_model_id?: number | null;
  is_archived?: boolean;
}

export interface ProjectResponse {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  slug: string;
  framework_version: string;
  backend_provider: string | null;
  default_model_id: number | null;
  last_generated_at: string | null;
  is_archived: boolean;
  created_on: string;
  updated_on: string;
}

export interface ProjectDetailResponse extends ProjectResponse {
  ast_snapshot: Record<string, unknown>;
  file_tree: unknown[];
  settings: Record<string, unknown>;
  backend_config: string | null;
  organization: {
    id: number;
    uuid: string;
    name: string;
    slug: string;
  };
}

// =============================================================================
// CONVERSATION API TYPES
// =============================================================================

export interface CreateConversationRequest {
  project_id: number;
  content: string;
}

export interface ConversationResponse {
  id: number;
  uuid: string;
  project_id: number;
  role: string;
  content: string;
  model_id: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  generation_time_ms: number | null;
  cost_usd: number | null;
  status: string;
  created_on: string;
}

export interface ConversationThread {
  project_id: number;
  messages: ConversationResponse[];
  total_tokens: number;
  total_cost: number;
}

// =============================================================================
// SETTINGS API TYPES
// =============================================================================

export interface SettingsResponse {
  supabase_url?: string;
  supabase_anon_key?: string;
  stripe_publishable_key?: string;
  features: {
    agent_mode: boolean;
    builder_mode: boolean;
    code_editor: boolean;
    terminal: boolean;
    github_integration: boolean;
    custom_api: boolean;
  };
  ai_models: AiModelConfig[];
}

export interface AiModelConfig {
  id: number;
  provider: string;
  model_name: string;
  display_name: string;
  max_tokens: number;
  cost_per_1k_input: number;
  cost_per_1k_output: number;
  is_available: boolean;
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  services?: {
    database: "up" | "down";
    redis?: "up" | "down";
  };
}

// =============================================================================
// SSE STREAMING TYPES
// =============================================================================

export type StreamChunkType =
  | "text"
  | "ast_operation"
  | "file_update"
  | "progress"
  | "done"
  | "error";

export interface StreamChunk {
  type: StreamChunkType;
  content?: string;
  data?: unknown;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

export interface ASTOperation {
  type: "create" | "update" | "delete" | "move";
  targetPath: string;
  content?: string;
  newPath?: string;
}

export interface GenerateRequest {
  prompt: string;
  current_file?: string;
  selected_code?: string;
  max_tokens?: number;
  temperature?: number;
}
