import crypto from "crypto";

import { logger } from "../../../config";
import type {
  BuildProviderConfig,
  CreateProjectInput,
  CreateProjectResult,
  UploadArchiveInput,
  UploadArchiveResult,
  TriggerBuildInput,
  TriggerBuildResult,
  BuildStatusResult,
  CancelBuildResult,
  WebhookPayload,
} from "../types";
import { BaseBuildAdapter } from "./base-adapter";

const EAS_API_BASE = "https://api.expo.dev";

interface EASBuildResponse {
  id: string;
  status: string;
  platform: string;
  artifacts?: {
    buildUrl?: string;
    logsUrl?: string;
  };
  error?: {
    message?: string;
  };
  completedAt?: string;
}

interface EASProjectResponse {
  id: string;
  slug: string;
}

interface EASWebhookBody {
  id: string;
  status: string;
  platform?: string;
  artifacts?: {
    buildUrl?: string;
    logsUrl?: string;
  };
  error?: {
    message?: string;
  };
  completedAt?: string;
}

const EAS_STATUS_MAP: Record<string, string> = {
  new: "queued",
  "in-queue": "queued",
  "in-progress": "building",
  finished: "completed",
  errored: "failed",
  canceled: "cancelled",
};

export class EASAdapter extends BaseBuildAdapter {
  readonly name = "eas";

  constructor(config: BuildProviderConfig) {
    super(config);
  }

  async createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
    return this.withRetry(async () => {
      const accountName = input.account_name || this.config.account_name;
      if (!accountName) {
        throw new Error("EXPO_ACCOUNT_NAME is required to create EAS projects");
      }

      const response = await fetch(`${EAS_API_BASE}/v2/projects`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          accountName,
          projectName: input.slug,
          privacy: "hidden",
          platform: "android",
        }),
        signal: AbortSignal.timeout(this.config.timeout_ms || 120000),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`EAS create project failed (${response.status}): ${errorBody}`);
      }

      const data = (await response.json()) as { data: EASProjectResponse };
      this.log("EAS project created", { projectId: data.data.id, slug: data.data.slug });

      return {
        provider_project_id: data.data.id,
        provider_project_slug: data.data.slug,
      };
    });
  }

  async uploadArchive(input: UploadArchiveInput): Promise<UploadArchiveResult> {
    return this.withRetry(async () => {
      const response = await fetch(
        `${EAS_API_BASE}/v2/projects/${input.provider_project_id}/uploads`,
        {
          method: "POST",
          headers: {
            ...this.getHeaders(),
            "Content-Type": "application/gzip",
          },
          body: input.archive,
          signal: AbortSignal.timeout(this.config.timeout_ms || 120000),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`EAS upload archive failed (${response.status}): ${errorBody}`);
      }

      const data = (await response.json()) as { data: { id: string } };
      this.log("Archive uploaded to EAS", { uploadId: data.data.id });

      return { upload_id: data.data.id };
    });
  }

  async triggerBuild(input: TriggerBuildInput): Promise<TriggerBuildResult> {
    return this.withRetry(async () => {
      const response = await fetch(
        `${EAS_API_BASE}/v2/projects/${input.provider_project_id}/builds`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            platform: input.platform,
            profile: input.profile,
            distribution: input.distribution,
            sdkVersion: input.sdk_version,
            appVersion: input.app_version,
          }),
          signal: AbortSignal.timeout(this.config.timeout_ms || 120000),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`EAS trigger build failed (${response.status}): ${errorBody}`);
      }

      const data = (await response.json()) as { data: EASBuildResponse };
      const build = data.data;

      this.log("EAS build triggered", { buildId: build.id, status: build.status });

      return {
        provider_build_id: build.id,
        status: this.normalizeStatus(build.status),
        logs_url: build.artifacts?.logsUrl,
      };
    });
  }

  async getBuildStatus(providerBuildId: string): Promise<BuildStatusResult> {
    return this.withRetry(async () => {
      const response = await fetch(`${EAS_API_BASE}/v2/builds/${providerBuildId}`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.config.timeout_ms || 120000),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`EAS get build status failed (${response.status}): ${errorBody}`);
      }

      const data = (await response.json()) as { data: EASBuildResponse };
      const build = data.data;

      return {
        provider_build_id: build.id,
        status: this.normalizeStatus(build.status),
        platform: build.platform,
        artifact_url: build.artifacts?.buildUrl,
        logs_url: build.artifacts?.logsUrl,
        error_message: build.error?.message,
        completed_at: build.completedAt,
      };
    });
  }

  async cancelBuild(providerBuildId: string): Promise<CancelBuildResult> {
    return this.withRetry(async () => {
      const response = await fetch(
        `${EAS_API_BASE}/v2/builds/${providerBuildId}/cancel`,
        {
          method: "POST",
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(this.config.timeout_ms || 120000),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`EAS cancel build failed (${response.status}): ${errorBody}`);
      }

      this.log("EAS build cancelled", { buildId: providerBuildId });

      return { success: true };
    });
  }

  verifyWebhook(signature: string, body: Buffer): boolean {
    const secret = this.config.webhook_secret;
    if (!secret) {
      logger.warn("EAS_WEBHOOK_SECRET not configured, skipping webhook verification");
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  parseWebhook(body: Buffer): WebhookPayload {
    const data = JSON.parse(body.toString()) as EASWebhookBody;

    return {
      provider_build_id: data.id,
      status: this.normalizeStatus(data.status),
      platform: data.platform,
      artifact_url: data.artifacts?.buildUrl,
      logs_url: data.artifacts?.logsUrl,
      error_message: data.error?.message,
      completed_at: data.completedAt,
    };
  }

  private normalizeStatus(easStatus: string): string {
    return EAS_STATUS_MAP[easStatus] || easStatus;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }
}
