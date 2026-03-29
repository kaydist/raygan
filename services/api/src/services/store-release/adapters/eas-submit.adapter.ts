import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";

import { logger } from "../../../config";
import type { SubmitProviderConfig, SubmitInput, SubmitResult, SubmitStatusResult } from "../types";
import { BaseSubmitAdapter } from "./base-submit-adapter";

const EAS_SUBMIT_STATUS_MAP: Record<string, string> = {
  CREATED: "pending",
  IN_PROGRESS: "submitting",
  FINISHED: "submitted",
  ERRORED: "failed",
  TIMED_OUT: "failed",
  CANCELED: "failed",
};

export class EASSubmitAdapter extends BaseSubmitAdapter {
  readonly name = "eas-submit";

  constructor(config: SubmitProviderConfig) {
    super(config);
  }

  async submitToStore(input: SubmitInput): Promise<SubmitResult> {
    return this.withRetry(async () => {
      const projectDir = input.project_dir;

      await this.ensureSubmitConfig(projectDir, input);

      const args = [
        "submit",
        "--platform", input.platform,
        "--non-interactive",
        "--json",
      ];

      if (input.build_id) {
        args.push("--id", input.build_id);
      }

      const envVars: Record<string, string | undefined> = {};

      if (input.store === "google_play") {
        envVars.GOOGLE_SERVICE_ACCOUNT_KEY_FILE_PATH = input.credential_file_path;
      }

      const output = await this.execEas(args, projectDir, envVars);
      const submission = this.parseJsonOutput<{
        id: string;
        status: string;
        submissionInfo?: { error?: { message?: string } };
      }>(output);

      this.log("EAS submission triggered", {
        submissionId: submission.id,
        status: submission.status,
        store: input.store,
      });

      return {
        provider_submission_id: submission.id,
        status: this.normalizeStatus(submission.status),
      };
    });
  }

  async getSubmitStatus(providerSubmissionId: string, projectDir: string): Promise<SubmitStatusResult> {
    return this.withRetry(async () => {
      const output = await this.execEas(
        ["submit", "--id", providerSubmissionId, "--json"],
        projectDir,
      );

      const submission = this.parseJsonOutput<{
        id: string;
        status: string;
        submissionInfo?: { error?: { message?: string } };
      }>(output);

      return {
        provider_submission_id: submission.id,
        status: this.normalizeStatus(submission.status),
        error_message: submission.submissionInfo?.error?.message,
      };
    });
  }

  private async ensureSubmitConfig(projectDir: string, input: SubmitInput): Promise<void> {
    const easJsonPath = path.join(projectDir, "eas.json");

    let easJson: Record<string, unknown> = {};
    try {
      const content = await fs.readFile(easJsonPath, "utf-8");
      easJson = JSON.parse(content) as Record<string, unknown>;
    } catch {
      easJson = { cli: { version: ">= 14.0.0" }, build: {} };
    }

    const submit: Record<string, unknown> = (easJson.submit as Record<string, unknown>) || {};

    if (input.store === "google_play") {
      submit.production = {
        ...(submit.production as Record<string, unknown> || {}),
        android: {
          serviceAccountKeyPath: input.credential_file_path,
          track: input.track,
        },
      };
    }

    easJson.submit = submit;

    await fs.writeFile(easJsonPath, JSON.stringify(easJson, null, 2));
  }

  private execEas(
    args: string[],
    cwd: string,
    extraEnv?: Record<string, string | undefined>,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const env: Record<string, string | undefined> = {
        ...process.env,
        EXPO_TOKEN: this.config.access_token,
        CI: "1",
        EAS_NO_VCS: "1",
        ...extraEnv,
      };

      const timeout = this.config.timeout_ms || 600_000;

      this.log("Executing EAS CLI (submit)", { args, cwd });

      execFile(
        "eas",
        args,
        { cwd, env, timeout, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            const stderrClean = (stderr || "")
              .split("\n")
              .filter((line: string) =>
                !line.includes("DeprecationWarning") &&
                !line.includes("--trace-deprecation"),
              )
              .join("\n")
              .trim();
            const errMsg = stderrClean || stdout?.trim() || error.message;
            this.logError(error, `eas ${args.join(" ")}`);
            logger.error({ stdout: stdout?.trim(), stderr: stderrClean }, "EAS CLI submit output on error");
            reject(new Error(`eas ${args[0]} failed: ${errMsg}`));
            return;
          }

          if (stderr) {
            logger.debug({ stderr: stderr.trim() }, "EAS CLI submit stderr");
          }

          resolve(stdout);
        },
      );
    });
  }

  private parseJsonOutput<T>(output: string): T {
    const trimmed = output.trim();

    const bracketIdx = trimmed.indexOf("[");
    const braceIdx = trimmed.indexOf("{");

    let jsonStart: number;
    if (bracketIdx === -1 && braceIdx === -1) {
      throw new Error(`EAS CLI submit output is not JSON: ${trimmed.substring(0, 200)}`);
    } else if (bracketIdx === -1) {
      jsonStart = braceIdx;
    } else if (braceIdx === -1) {
      jsonStart = bracketIdx;
    } else {
      jsonStart = Math.min(bracketIdx, braceIdx);
    }

    return JSON.parse(trimmed.substring(jsonStart)) as T;
  }

  private normalizeStatus(easStatus: string): string {
    return (
      EAS_SUBMIT_STATUS_MAP[easStatus] ||
      EAS_SUBMIT_STATUS_MAP[easStatus.toUpperCase()] ||
      easStatus
    );
  }
}
