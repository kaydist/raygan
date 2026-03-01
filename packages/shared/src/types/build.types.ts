export type BuildStatus =
  | "queued"
  | "provisioning"
  | "building"
  | "completed"
  | "failed"
  | "cancelled";

export type BuildPlatform = "android";

export type BuildProfile = "development" | "preview" | "production";

export type BuildDistribution = "internal" | "store";

export type BuildProvider = "eas";

export interface BuildResponse {
  uuid: string;
  project_id: string;
  organization_id: string;
  platform: BuildPlatform;
  status: BuildStatus;
  profile: BuildProfile;
  distribution: BuildDistribution;
  provider: BuildProvider;
  provider_build_id: string | null;
  artifact_url: string | null;
  logs_url: string | null;
  error_message: string | null;
  sdk_version: string | null;
  app_version: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_on: string;
  updated_on: string;
}

export interface BuildListResponse {
  builds: BuildResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface TriggerBuildRequest {
  platform: BuildPlatform;
  profile?: BuildProfile;
  distribution?: BuildDistribution;
}

export interface BuildStatusEvent {
  project_id: string;
  build_uuid: string;
  status: BuildStatus;
  artifact_url?: string | null;
  error_message?: string | null;
  provider_build_id?: string | null;
  logs_url?: string | null;
}
