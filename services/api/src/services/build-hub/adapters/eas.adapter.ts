import crypto from "crypto";
import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";

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

/* ------------------------------------------------------------------ */
/*  Expo / EAS API types                                               */
/* ------------------------------------------------------------------ */

interface EASWebhookBody {
  id: string;
  status: string;
  platform?: string;
  artifacts?: { buildUrl?: string; logsUrl?: string };
  error?: { message?: string };
  completedAt?: string;
}

const EAS_STATUS_MAP: Record<string, string> = {
  NEW: "queued",
  IN_QUEUE: "queued",
  IN_PROGRESS: "building",
  PENDING_CANCEL: "cancelled",
  FINISHED: "completed",
  ERRORED: "failed",
  CANCELED: "cancelled",
};

function generateEasJson(
  profile: string,
  distribution: string,
): Record<string, unknown> {
  return {
    cli: { version: ">= 14.0.0" },
    build: {
      development: {
        developmentClient: true,
        distribution: "internal",
        android: { buildType: "apk", image: "latest" },
      },
      preview: {
        distribution: "internal",
        android: { buildType: "apk", image: "latest" },
      },
      production: {
        distribution: distribution === "store" ? "store" : "internal",
        android: { image: "latest" },
      },
      [profile]: {
        distribution: distribution === "store" ? "store" : "internal",
        android: {
          buildType: distribution === "store" ? "app-bundle" : "apk",
          image: "latest",
        },
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Adapter                                                            */
/* ------------------------------------------------------------------ */

export class EASAdapter extends BaseBuildAdapter {
  readonly name = "eas";

  constructor(config: BuildProviderConfig) {
    super(config);
  }

  /* ---- public BuildProvider methods ---- */

  async createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
    return this.withRetry(async () => {
      const accountName = input.account_name || this.config.account_name;
      if (!accountName) {
        throw new Error("EXPO_ACCOUNT_NAME is required to create EAS projects");
      }

      // Scaffold a temp directory with app.json so `eas init` can run
      const tmpDir = path.join("/tmp", `eas-init-${input.slug}-${Date.now()}`);
      await fs.mkdir(tmpDir, { recursive: true });

      const appJson = {
        expo: {
          name: input.name || input.slug,
          slug: input.slug,
        },
      };
      await fs.writeFile(path.join(tmpDir, "app.json"), JSON.stringify(appJson, null, 2));

      const pkgJson = {
        name: input.slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
        version: "1.0.0",
      };
      await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify(pkgJson, null, 2));

      // eas init requires a git repo
      await new Promise<void>((resolve, reject) => {
        execFile("git", ["init"], { cwd: tmpDir }, (err) => err ? reject(err) : resolve());
      });

      try {
        // `eas init` creates the project if it doesn't exist, or links to existing
        const output = await this.execEas(["init", "--non-interactive", "--force"], tmpDir, { noVcs: false });
        this.log("eas init output", { slug: input.slug, output: output.trim() });

        // Read back app.json to get the injected project ID
        const updatedAppJson = JSON.parse(
          await fs.readFile(path.join(tmpDir, "app.json"), "utf-8"),
        ) as { expo?: { extra?: { eas?: { projectId?: string } } } };

        const projectId = updatedAppJson.expo?.extra?.eas?.projectId;
        if (projectId) {
          return {
            provider_project_id: projectId,
            provider_project_slug: input.slug,
          };
        }

        // If eas init didn't inject the ID, parse it from CLI output
        // Output typically contains the project ID in various formats
        const idMatch = output.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (idMatch) {
          return {
            provider_project_id: idMatch[1]!,
            provider_project_slug: input.slug,
          };
        }

        throw new Error(`eas init succeeded but could not extract project ID from output: ${output.trim()}`);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    });
  }

  async uploadArchive(_input: UploadArchiveInput): Promise<UploadArchiveResult> {
    return { upload_id: "cli-managed" };
  }

  async triggerBuild(input: TriggerBuildInput): Promise<TriggerBuildResult> {
    return this.withRetry(async () => {
      const projectDir = input.project_dir;

      await this.ensurePackageJson(projectDir, input.provider_project_id);
      await this.injectProjectId(projectDir, input.provider_project_id);
      await this.ensureEasJson(projectDir, input.profile, input.distribution);

      // Use EAS CLI for the actual build submission — it handles archive upload,
      // credential management, and the complex build pipeline.
      const args = [
        "build",
        "--platform", input.platform,
        "--profile", input.profile,
        "--non-interactive",
        "--no-wait",
        "--json",
      ];

      const output = await this.execEas(args, projectDir);
      const builds = this.parseJsonOutput<Array<{
        id: string;
        status: string;
        artifacts?: { buildUrl?: string; logsUrl?: string };
      }>>(output);

      if (!builds || builds.length === 0) {
        throw new Error("EAS CLI returned no build data");
      }

      const build = builds[0]!;
      this.log("EAS build triggered", { buildId: build.id, status: build.status });

      return {
        provider_build_id: build.id,
        status: this.normalizeStatus(build.status),
        logs_url: build.artifacts?.logsUrl,
      };
    });
  }

  async getBuildStatus(providerBuildId: string, providerProjectId?: string, projectSlug?: string): Promise<BuildStatusResult> {
    return this.withRetry(async () => {
      const projectDir = await this.ensureEasProjectDir(providerProjectId || providerBuildId, projectSlug);

      const output = await this.execEas(
        ["build:view", providerBuildId, "--json"],
        projectDir,
        { noVcs: false },
      );

      const build = this.parseJsonOutput<{
        id: string;
        status: string;
        platform: string;
        artifacts?: { buildUrl?: string };
        error?: { message?: string; errorCode?: string };
        createdAt?: string;
        completedAt?: string;
      }>(output);

      return {
        provider_build_id: build.id,
        status: this.normalizeStatus(build.status),
        platform: build.platform?.toLowerCase() || "android",
        artifact_url: build.artifacts?.buildUrl,
        error_message: build.error?.message,
        completed_at: build.completedAt,
      };
    });
  }

  async cancelBuild(providerBuildId: string, providerProjectId?: string, projectSlug?: string): Promise<CancelBuildResult> {
    return this.withRetry(async () => {
      const projectDir = await this.ensureEasProjectDir(providerProjectId || providerBuildId, projectSlug);
      await this.execEas(
        ["build:cancel", providerBuildId, "--non-interactive"],
        projectDir,
        { noVcs: false },
      );
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

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }

  parseWebhook(body: Buffer): WebhookPayload {
    const data = JSON.parse(body.toString()) as EASWebhookBody;

    return {
      provider_build_id: data.id,
      status: this.normalizeStatus(data.status),
      platform: data.platform?.toLowerCase(),
      artifact_url: data.artifacts?.buildUrl,
      logs_url: data.artifacts?.logsUrl,
      error_message: data.error?.message,
      completed_at: data.completedAt,
    };
  }



  /* ---- EAS project dir for CLI commands that need project context ---- */

  private async ensureEasProjectDir(easProjectId: string, slug?: string): Promise<string> {
    const dir = path.join("/tmp", "eas-project-ctx", easProjectId);
    const projectSlug = slug || easProjectId;

    try {
      const existing = await fs.readFile(path.join(dir, "app.json"), "utf-8");
      const parsed = JSON.parse(existing) as { expo?: { slug?: string } };
      // If slug matches (or no slug provided), reuse
      if (!slug || parsed.expo?.slug === projectSlug) {
        return dir;
      }
      // Slug mismatch — recreate
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // Doesn't exist yet — create below
    }

    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(
      path.join(dir, "app.json"),
      JSON.stringify({
        expo: {
          slug: projectSlug,
          extra: { eas: { projectId: easProjectId } },
        },
      }, null, 2),
    );

    await fs.writeFile(
      path.join(dir, "package.json"),
      JSON.stringify({ name: projectSlug, version: "1.0.0" }, null, 2),
    );

    await new Promise<void>((resolve, reject) => {
      execFile("git", ["init"], { cwd: dir }, (err) => err ? reject(err) : resolve());
    });

    return dir;
  }

  /* ---- EAS CLI helper ---- */

  private execEas(args: string[], cwd?: string, options?: { noVcs?: boolean }): Promise<string> {
    return new Promise((resolve, reject) => {
      const env: Record<string, string | undefined> = {
        ...process.env,
        EXPO_TOKEN: this.config.access_token,
        CI: "1",
      };
      if (options?.noVcs !== false) {
        env.EAS_NO_VCS = "1";
      }

      const timeout = this.config.timeout_ms || 300_000;

      this.log("Executing EAS CLI", { args, cwd });

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
            logger.error({ stdout: stdout?.trim(), stderr: stderrClean }, "EAS CLI output on error");
            reject(new Error(`eas ${args[0]} failed: ${errMsg}`));
            return;
          }

          if (stderr) {
            logger.debug({ stderr: stderr.trim() }, "EAS CLI stderr");
          }

          resolve(stdout);
        },
      );
    });
  }

  /* ---- File helpers ---- */

  private parseJsonOutput<T>(output: string): T {
    const trimmed = output.trim();

    const bracketIdx = trimmed.indexOf("[");
    const braceIdx = trimmed.indexOf("{");

    let jsonStart: number;
    if (bracketIdx === -1 && braceIdx === -1) {
      throw new Error(`EAS CLI output is not JSON: ${trimmed.substring(0, 200)}`);
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
      EAS_STATUS_MAP[easStatus] ||
      EAS_STATUS_MAP[easStatus.toUpperCase()] ||
      easStatus
    );
  }

  private async ensurePackageJson(projectDir: string, slug: string): Promise<void> {
    const pkgJsonPath = path.join(projectDir, "package.json");

    try {
      await fs.access(pkgJsonPath);
    } catch {
      const pkgJson = {
        name: slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
        version: "1.0.0",
        main: "node_modules/expo/AppEntry.js",
        scripts: {
          start: "expo start",
          android: "expo start --android",
          ios: "expo start --ios",
        },
        dependencies: {
          expo: "~52.0.0",
          "expo-status-bar": "~2.0.0",
          react: "18.3.1",
          "react-native": "0.76.3",
        },
        private: true,
      };
      await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
    }
  }

  private async injectProjectId(projectDir: string, easProjectId: string): Promise<void> {
    const appJsonPath = path.join(projectDir, "app.json");

    let appJson: Record<string, unknown>;
    try {
      const content = await fs.readFile(appJsonPath, "utf-8");
      appJson = JSON.parse(content) as Record<string, unknown>;
    } catch {
      appJson = { expo: {} };
    }

    const expo = (appJson.expo || appJson) as Record<string, unknown>;

    // Inject EAS project ID
    if (!expo.extra) expo.extra = {};
    const extra = expo.extra as Record<string, unknown>;
    if (!extra.eas) extra.eas = {};
    (extra.eas as Record<string, unknown>).projectId = easProjectId;

    // Ensure android.package is set (required for non-interactive builds)
    if (!expo.android) expo.android = {};
    const android = expo.android as Record<string, unknown>;
    if (!android.package) {
      const slug = (expo.slug as string) || easProjectId;
      android.package = `com.raygan.${slug.replace(/[^a-zA-Z0-9]/g, "")}`;
    }

    if (appJson.expo) appJson.expo = expo;

    await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
  }

  private async ensureEasJson(
    projectDir: string,
    profile: string,
    distribution: string,
  ): Promise<void> {
    const easJsonPath = path.join(projectDir, "eas.json");

    try {
      await fs.access(easJsonPath);
    } catch {
      const easJson = generateEasJson(profile, distribution);
      await fs.writeFile(easJsonPath, JSON.stringify(easJson, null, 2));
    }
  }
}
