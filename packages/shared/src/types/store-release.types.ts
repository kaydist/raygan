// Store types
export type StoreType = "google_play" | "apple_app_store";
export type ReleaseTrack = "internal" | "alpha" | "beta" | "production";
export type ReleaseStatus =
  | "pending"
  | "submitting"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "live"
  | "failed";

// Project Settings
export type ProjectSettingCategory =
  | "store_credentials"
  | "eas"
  | "signing"
  | "build"
  | "integrations"
  | "general";

export interface ProjectSettingResponse {
  uuid: string;
  project_id: string;
  category: string;
  slug: string;
  value: string;
  value_type: "string" | "number" | "boolean" | "json";
  is_encrypted: boolean;
  is_valid: boolean | null;
  last_verified_at: string | null;
  visibility: "private" | "internal";
  description: string | null;
  created_on: string;
  updated_on: string;
}

export interface UpsertProjectSettingRequest {
  value: string;
  value_type?: "string" | "number" | "boolean" | "json";
  is_encrypted?: boolean;
  visibility?: "private" | "internal";
  description?: string;
}

// Store Listings
export interface StoreListingResponse {
  uuid: string;
  project_id: string;
  store: StoreType;
  title: string;
  short_description: string | null;
  full_description: string | null;
  category: string | null;
  privacy_policy_url: string | null;
  support_email: string | null;
  screenshots: string[];
  feature_graphic_url: string | null;
  created_on: string;
  updated_on: string;
}

export interface UpsertStoreListingRequest {
  title: string;
  short_description?: string;
  full_description?: string;
  category?: string;
  privacy_policy_url?: string;
  support_email?: string;
  screenshots?: string[];
  feature_graphic_url?: string;
}

// Store Releases
export interface StoreReleaseResponse {
  uuid: string;
  project_id: string;
  organization_id: string;
  build_uuid: string;
  store: StoreType;
  track: ReleaseTrack;
  status: ReleaseStatus;
  provider_submission_id: string | null;
  artifact_url: string | null;
  error_message: string | null;
  submitted_at: string | null;
  review_completed_at: string | null;
  auto_triggered: boolean;
  created_on: string;
  updated_on: string;
}

export interface StoreReleaseListResponse {
  releases: StoreReleaseResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateStoreReleaseRequest {
  build_uuid: string;
  store: StoreType;
  track: ReleaseTrack;
}

export interface ReleaseStatusEvent {
  project_id: string;
  release_uuid: string;
  status: ReleaseStatus;
  error_message?: string | null;
  provider_submission_id?: string | null;
}

export interface ReleaseAutoTriggeredEvent {
  project_id: string;
  build_uuid: string;
  release_uuid: string;
}
