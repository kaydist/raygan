import { logger } from "../../../config";
import type {
  BuildProvider,
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

export abstract class BaseBuildAdapter implements BuildProvider {
  abstract readonly name: string;
  protected config: BuildProviderConfig;

  constructor(config: BuildProviderConfig) {
    this.config = {
      timeout_ms: 120000,
      max_retries: 3,
      ...config,
    };
  }

  abstract createProject(input: CreateProjectInput): Promise<CreateProjectResult>;
  abstract uploadArchive(input: UploadArchiveInput): Promise<UploadArchiveResult>;
  abstract triggerBuild(input: TriggerBuildInput): Promise<TriggerBuildResult>;
  abstract getBuildStatus(providerBuildId: string): Promise<BuildStatusResult>;
  abstract cancelBuild(providerBuildId: string): Promise<CancelBuildResult>;
  abstract verifyWebhook(signature: string, body: Buffer): boolean;
  abstract parseWebhook(body: Buffer): WebhookPayload;

  protected log(message: string, data?: Record<string, unknown>): void {
    logger.info({ provider: this.name, ...data }, message);
  }

  protected logError(error: unknown, context?: string): void {
    logger.error({ provider: this.name, error, context }, "Build adapter error");
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    retries = this.config.max_retries || 3,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          logger.warn(
            { provider: this.name, attempt, delay },
            "Retrying build provider request",
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
