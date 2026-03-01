export interface BuildProviderConfig {
  access_token: string;
  account_name?: string;
  webhook_secret?: string;
  timeout_ms?: number;
  max_retries?: number;
}

export interface CreateProjectInput {
  name: string;
  slug: string;
  account_name?: string;
}

export interface CreateProjectResult {
  provider_project_id: string;
  provider_project_slug: string;
}

export interface UploadArchiveInput {
  provider_project_id: string;
  archive: Buffer;
}

export interface UploadArchiveResult {
  upload_id: string;
}

export interface TriggerBuildInput {
  provider_project_id: string;
  platform: "android";
  profile: "development" | "preview" | "production";
  distribution: "internal" | "store";
  sdk_version: string;
  app_version?: string;
}

export interface TriggerBuildResult {
  provider_build_id: string;
  status: string;
  logs_url?: string;
}

export interface BuildStatusResult {
  provider_build_id: string;
  status: string;
  platform: string;
  artifact_url?: string;
  logs_url?: string;
  error_message?: string;
  completed_at?: string;
}

export interface CancelBuildResult {
  success: boolean;
}

export interface WebhookPayload {
  provider_build_id: string;
  status: string;
  platform?: string;
  artifact_url?: string;
  logs_url?: string;
  error_message?: string;
  completed_at?: string;
}

export interface BuildProvider {
  readonly name: string;

  createProject(input: CreateProjectInput): Promise<CreateProjectResult>;

  uploadArchive(input: UploadArchiveInput): Promise<UploadArchiveResult>;

  triggerBuild(input: TriggerBuildInput): Promise<TriggerBuildResult>;

  getBuildStatus(providerBuildId: string): Promise<BuildStatusResult>;

  cancelBuild(providerBuildId: string): Promise<CancelBuildResult>;

  verifyWebhook(signature: string, body: Buffer): boolean;

  parseWebhook(body: Buffer): WebhookPayload;
}
