import { logger } from "../../../config";
import type {
  SubmitProvider,
  SubmitProviderConfig,
  SubmitInput,
  SubmitResult,
  SubmitStatusResult,
} from "../types";

export abstract class BaseSubmitAdapter implements SubmitProvider {
  abstract readonly name: string;
  protected config: SubmitProviderConfig;

  constructor(config: SubmitProviderConfig) {
    this.config = {
      timeout_ms: 600_000,
      max_retries: 2,
      ...config,
    };
  }

  abstract submitToStore(input: SubmitInput): Promise<SubmitResult>;
  abstract getSubmitStatus(providerSubmissionId: string, projectDir: string): Promise<SubmitStatusResult>;

  protected log(message: string, data?: Record<string, unknown>): void {
    logger.info({ provider: this.name, ...data }, message);
  }

  protected logError(error: unknown, context?: string): void {
    logger.error({ provider: this.name, error, context }, "Submit adapter error");
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    retries = this.config.max_retries || 2,
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
            "Retrying submit provider request",
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
