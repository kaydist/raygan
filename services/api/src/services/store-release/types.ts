import type { ReleaseStoreType, ReleaseTrackType } from "../../db/entities";

export interface SubmitProviderConfig {
  access_token: string;
  account_name?: string;
  webhook_secret?: string;
  timeout_ms?: number;
  max_retries?: number;
}

export interface SubmitInput {
  provider_project_id: string;
  platform: "android" | "ios";
  store: ReleaseStoreType;
  track: ReleaseTrackType;
  build_id?: string;
  credential_file_path: string;
  project_dir: string;
}

export interface SubmitResult {
  provider_submission_id: string;
  status: string;
}

export interface SubmitStatusResult {
  provider_submission_id: string;
  status: string;
  error_message?: string;
}

export interface SubmitProvider {
  readonly name: string;
  submitToStore(input: SubmitInput): Promise<SubmitResult>;
  getSubmitStatus(providerSubmissionId: string, projectDir: string): Promise<SubmitStatusResult>;
}
