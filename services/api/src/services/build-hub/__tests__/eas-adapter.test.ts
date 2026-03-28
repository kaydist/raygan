import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";

import { EASAdapter } from "../adapters/eas.adapter";
import type { BuildProviderConfig, TriggerBuildInput } from "../types";

vi.mock("../../../config", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeConfig(overrides?: Partial<BuildProviderConfig>): BuildProviderConfig {
  return {
    access_token: "test-expo-token",
    account_name: "testaccount",
    webhook_secret: "whsec_test123",
    max_retries: 1,
    ...overrides,
  };
}

function gqlOk<T>(data: T) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data }),
    text: () => Promise.resolve(JSON.stringify({ data })),
  };
}

function gqlError(message: string) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ errors: [{ message }] }),
    text: () => Promise.resolve(JSON.stringify({ errors: [{ message }] })),
  };
}

function httpError(status: number, body: string) {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(body),
  };
}

describe("EASAdapter", () => {
  let adapter: EASAdapter;
  let tmpDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    adapter = new EASAdapter(makeConfig());
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "eas-test-"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  /* ---------------------------------------------------------------- */
  /*  createProject                                                    */
  /* ---------------------------------------------------------------- */

  describe("createProject", () => {
    it("should find an existing project and return its ID", async () => {
      mockFetch.mockResolvedValueOnce(
        gqlOk({ app: { byFullName: { id: "proj-abc-123", slug: "my-app" } } }),
      );

      const result = await adapter.createProject({
        name: "My App",
        slug: "my-app",
      });

      expect(result.provider_project_id).toBe("proj-abc-123");
      expect(result.provider_project_slug).toBe("my-app");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify it called the GraphQL endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.expo.dev/graphql",
        expect.objectContaining({ method: "POST" }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables.fullName).toBe("@testaccount/my-app");
    });

    it("should create a new project when none exists", async () => {
      // findProjectByFullName returns null (byFullName is null)
      mockFetch.mockResolvedValueOnce(
        gqlOk({ app: { byFullName: null } }),
      );

      // AccountByName query
      mockFetch.mockResolvedValueOnce(
        gqlOk({ account: { byName: { id: "acct-001" } } }),
      );

      // CreateAppMutation
      mockFetch.mockResolvedValueOnce(
        gqlOk({ app: { createApp: { id: "proj-new-456" } } }),
      );

      const result = await adapter.createProject({
        name: "New App",
        slug: "new-app",
      });

      expect(result.provider_project_id).toBe("proj-new-456");
      expect(result.provider_project_slug).toBe("new-app");
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify create mutation used AppInput with accountId + projectName
      const createBody = JSON.parse(mockFetch.mock.calls[2][1].body);
      expect(createBody.variables.appInput).toEqual({
        accountId: "acct-001",
        projectName: "new-app",
      });
    });

    it("should recover when create fails with 'already exists' by retrying lookup", async () => {
      // Initial lookup returns null
      mockFetch.mockResolvedValueOnce(
        gqlOk({ app: { byFullName: null } }),
      );

      // AccountByName
      mockFetch.mockResolvedValueOnce(
        gqlOk({ account: { byName: { id: "acct-001" } } }),
      );

      // CreateApp fails with "already exists"
      mockFetch.mockResolvedValueOnce(
        gqlError("A project with this slug has previously been created by this account. Provide a different project slug."),
      );

      // Retry lookup succeeds
      mockFetch.mockResolvedValueOnce(
        gqlOk({ app: { byFullName: { id: "proj-existing-789", slug: "my-app" } } }),
      );

      const result = await adapter.createProject({
        name: "My App",
        slug: "my-app",
      });

      expect(result.provider_project_id).toBe("proj-existing-789");
      expect(result.provider_project_slug).toBe("my-app");
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it("should throw when account_name is missing", async () => {
      const noAccountAdapter = new EASAdapter(
        makeConfig({ account_name: undefined }),
      );

      await expect(
        noAccountAdapter.createProject({ name: "App", slug: "app" }),
      ).rejects.toThrow("EXPO_ACCOUNT_NAME is required");
    });

    it("should use input.account_name over config", async () => {
      mockFetch.mockResolvedValueOnce(
        gqlOk({ app: { byFullName: { id: "proj-override", slug: "my-app" } } }),
      );

      await adapter.createProject({
        name: "My App",
        slug: "my-app",
        account_name: "override-account",
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables.fullName).toBe("@override-account/my-app");
    });

    it("should throw on GraphQL error during account lookup", async () => {
      // findProjectByFullName catches errors and returns null
      mockFetch.mockResolvedValueOnce(gqlError("Not found"));

      // AccountByName fails
      mockFetch.mockResolvedValueOnce(gqlError("Account not found"));

      await expect(
        adapter.createProject({ name: "App", slug: "app" }),
      ).rejects.toThrow("Expo GraphQL error: Account not found");
    });

    it("should throw on HTTP error from Expo API", async () => {
      // findProjectByFullName catches and returns null
      mockFetch.mockResolvedValueOnce(httpError(500, "Internal Server Error"));

      // Account lookup also fails with HTTP error
      mockFetch.mockResolvedValueOnce(httpError(401, "Unauthorized"));

      await expect(
        adapter.createProject({ name: "App", slug: "app" }),
      ).rejects.toThrow("Expo API request failed (401)");
    });
  });

  /* ---------------------------------------------------------------- */
  /*  getBuildStatus                                                   */
  /* ---------------------------------------------------------------- */

  describe("getBuildStatus", () => {
    it("should return normalized build status", async () => {
      mockFetch.mockResolvedValueOnce(
        gqlOk({
          builds: {
            byId: {
              id: "build-123",
              status: "FINISHED",
              platform: "ANDROID",
              artifacts: {
                buildUrl: "https://expo.dev/artifacts/build-123.apk",
                logsUrl: "https://expo.dev/logs/build-123",
              },
              completedAt: "2026-03-28T00:00:00Z",
            },
          },
        }),
      );

      const result = await adapter.getBuildStatus("build-123");

      expect(result.provider_build_id).toBe("build-123");
      expect(result.status).toBe("completed");
      expect(result.platform).toBe("android");
      expect(result.artifact_url).toBe("https://expo.dev/artifacts/build-123.apk");
      expect(result.logs_url).toBe("https://expo.dev/logs/build-123");
      expect(result.completed_at).toBe("2026-03-28T00:00:00Z");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables.buildId).toBe("build-123");
    });

    it("should return error info for failed builds", async () => {
      mockFetch.mockResolvedValueOnce(
        gqlOk({
          builds: {
            byId: {
              id: "build-456",
              status: "ERRORED",
              platform: "ANDROID",
              error: { message: "Build script failed", errorCode: "BUILD_FAILED" },
              completedAt: "2026-03-28T01:00:00Z",
            },
          },
        }),
      );

      const result = await adapter.getBuildStatus("build-456");

      expect(result.status).toBe("failed");
      expect(result.error_message).toBe("Build script failed");
    });

    it("should normalize all EAS status values", async () => {
      const statusMap: Record<string, string> = {
        NEW: "queued",
        IN_QUEUE: "queued",
        IN_PROGRESS: "building",
        PENDING_CANCEL: "cancelled",
        FINISHED: "completed",
        ERRORED: "failed",
        CANCELED: "cancelled",
      };

      for (const [easStatus, expected] of Object.entries(statusMap)) {
        mockFetch.mockResolvedValueOnce(
          gqlOk({
            builds: { byId: { id: "b-1", status: easStatus, platform: "ANDROID" } },
          }),
        );

        const result = await adapter.getBuildStatus("b-1");
        expect(result.status).toBe(expected);
      }
    });

    it("should throw on GraphQL error", async () => {
      mockFetch.mockResolvedValueOnce(gqlError("Build not found"));

      await expect(adapter.getBuildStatus("missing-id")).rejects.toThrow(
        "Expo GraphQL error: Build not found",
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /*  cancelBuild                                                      */
  /* ---------------------------------------------------------------- */

  describe("cancelBuild", () => {
    it("should call cancel mutation and return success", async () => {
      mockFetch.mockResolvedValueOnce(
        gqlOk({ build: { cancel: { id: "build-789", status: "CANCELED" } } }),
      );

      const result = await adapter.cancelBuild("build-789");

      expect(result.success).toBe(true);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.variables.buildId).toBe("build-789");
    });

    it("should throw on cancel failure", async () => {
      mockFetch.mockResolvedValueOnce(gqlError("Build cannot be cancelled"));

      await expect(adapter.cancelBuild("build-999")).rejects.toThrow(
        "Build cannot be cancelled",
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /*  verifyWebhook                                                    */
  /* ---------------------------------------------------------------- */

  describe("verifyWebhook", () => {
    it("should verify a valid HMAC signature", () => {
      const body = Buffer.from('{"id":"build-1","status":"FINISHED"}');
      const crypto = require("crypto");
      const expectedSig = crypto
        .createHmac("sha256", "whsec_test123")
        .update(body)
        .digest("hex");

      expect(adapter.verifyWebhook(expectedSig, body)).toBe(true);
    });

    it("should reject an invalid signature", () => {
      const body = Buffer.from('{"id":"build-1","status":"FINISHED"}');
      expect(adapter.verifyWebhook("invalid-signature", body)).toBe(false);
    });

    it("should return false when webhook_secret is not configured", () => {
      const noSecretAdapter = new EASAdapter(
        makeConfig({ webhook_secret: undefined }),
      );
      const body = Buffer.from("{}");

      expect(noSecretAdapter.verifyWebhook("any-sig", body)).toBe(false);
    });
  });

  /* ---------------------------------------------------------------- */
  /*  parseWebhook                                                     */
  /* ---------------------------------------------------------------- */

  describe("parseWebhook", () => {
    it("should parse a completed build webhook", () => {
      const payload = {
        id: "build-abc",
        status: "FINISHED",
        platform: "ANDROID",
        artifacts: {
          buildUrl: "https://expo.dev/artifacts/abc.apk",
          logsUrl: "https://expo.dev/logs/abc",
        },
        completedAt: "2026-03-28T12:00:00Z",
      };

      const result = adapter.parseWebhook(Buffer.from(JSON.stringify(payload)));

      expect(result.provider_build_id).toBe("build-abc");
      expect(result.status).toBe("completed");
      expect(result.platform).toBe("android");
      expect(result.artifact_url).toBe("https://expo.dev/artifacts/abc.apk");
      expect(result.logs_url).toBe("https://expo.dev/logs/abc");
      expect(result.completed_at).toBe("2026-03-28T12:00:00Z");
    });

    it("should parse a failed build webhook with error", () => {
      const payload = {
        id: "build-err",
        status: "ERRORED",
        error: { message: "Gradle build failed" },
      };

      const result = adapter.parseWebhook(Buffer.from(JSON.stringify(payload)));

      expect(result.status).toBe("failed");
      expect(result.error_message).toBe("Gradle build failed");
    });

    it("should handle cancelled build webhook", () => {
      const payload = { id: "build-can", status: "CANCELED" };
      const result = adapter.parseWebhook(Buffer.from(JSON.stringify(payload)));
      expect(result.status).toBe("cancelled");
    });
  });

  /* ---------------------------------------------------------------- */
  /*  uploadArchive                                                    */
  /* ---------------------------------------------------------------- */

  describe("uploadArchive", () => {
    it("should return cli-managed upload_id", async () => {
      const result = await adapter.uploadArchive({
        provider_project_id: "proj-1",
        archive: Buffer.from("fake"),
      });

      expect(result.upload_id).toBe("cli-managed");
    });
  });

  /* ---------------------------------------------------------------- */
  /*  File helpers (via triggerBuild prep)                              */
  /* ---------------------------------------------------------------- */

  describe("file preparation for triggerBuild", () => {
    it("should create package.json when missing", async () => {
      await fs.writeFile(
        path.join(tmpDir, "app.json"),
        JSON.stringify({ expo: { name: "test", slug: "test" } }),
      );

      const input: TriggerBuildInput = {
        provider_project_id: "proj-test-id",
        platform: "android",
        profile: "preview",
        distribution: "internal",
        sdk_version: "52.0.0",
        project_dir: tmpDir,
      };

      try { await adapter.triggerBuild(input); } catch { /* eas CLI not in tests */ }

      const pkgJson = JSON.parse(await fs.readFile(path.join(tmpDir, "package.json"), "utf-8"));
      expect(pkgJson.dependencies.expo).toBeDefined();

      const appJson = JSON.parse(await fs.readFile(path.join(tmpDir, "app.json"), "utf-8"));
      expect(appJson.expo.extra.eas.projectId).toBe("proj-test-id");

      const easJson = JSON.parse(await fs.readFile(path.join(tmpDir, "eas.json"), "utf-8"));
      expect(easJson.build.preview).toBeDefined();
    });

    it("should not overwrite existing package.json", async () => {
      await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "existing-app", version: "2.0.0" }));
      await fs.writeFile(path.join(tmpDir, "app.json"), JSON.stringify({ expo: { name: "test", slug: "test" } }));

      const input: TriggerBuildInput = {
        provider_project_id: "proj-id",
        platform: "android",
        profile: "preview",
        distribution: "internal",
        sdk_version: "52.0.0",
        project_dir: tmpDir,
      };

      try { await adapter.triggerBuild(input); } catch { /* expected */ }

      const pkgJson = JSON.parse(await fs.readFile(path.join(tmpDir, "package.json"), "utf-8"));
      expect(pkgJson.name).toBe("existing-app");
      expect(pkgJson.version).toBe("2.0.0");
    });

    it("should inject EAS project ID into existing app.json", async () => {
      await fs.writeFile(
        path.join(tmpDir, "app.json"),
        JSON.stringify({ expo: { name: "My App", slug: "my-app", version: "1.0.0" } }),
      );

      const input: TriggerBuildInput = {
        provider_project_id: "proj-injected-id",
        platform: "android",
        profile: "production",
        distribution: "store",
        sdk_version: "52.0.0",
        project_dir: tmpDir,
      };

      try { await adapter.triggerBuild(input); } catch { /* expected */ }

      const updated = JSON.parse(await fs.readFile(path.join(tmpDir, "app.json"), "utf-8"));
      expect(updated.expo.extra.eas.projectId).toBe("proj-injected-id");
      expect(updated.expo.name).toBe("My App");
      expect(updated.expo.version).toBe("1.0.0");
    });

    it("should create app.json when missing during project ID injection", async () => {
      const input: TriggerBuildInput = {
        provider_project_id: "proj-created-id",
        platform: "android",
        profile: "preview",
        distribution: "internal",
        sdk_version: "52.0.0",
        project_dir: tmpDir,
      };

      try { await adapter.triggerBuild(input); } catch { /* expected */ }

      const appJson = JSON.parse(await fs.readFile(path.join(tmpDir, "app.json"), "utf-8"));
      expect(appJson.expo.extra.eas.projectId).toBe("proj-created-id");
    });

    it("should generate correct eas.json for store distribution", async () => {
      await fs.writeFile(
        path.join(tmpDir, "app.json"),
        JSON.stringify({ expo: { name: "test", slug: "test" } }),
      );

      const input: TriggerBuildInput = {
        provider_project_id: "proj-id",
        platform: "android",
        profile: "production",
        distribution: "store",
        sdk_version: "52.0.0",
        project_dir: tmpDir,
      };

      try { await adapter.triggerBuild(input); } catch { /* expected */ }

      const easJson = JSON.parse(await fs.readFile(path.join(tmpDir, "eas.json"), "utf-8"));
      expect(easJson.build.production.distribution).toBe("store");
      expect(easJson.build.production.android.buildType).toBe("app-bundle");
    });
  });

  /* ---------------------------------------------------------------- */
  /*  GraphQL auth                                                     */
  /* ---------------------------------------------------------------- */

  describe("graphql auth", () => {
    it("should send authorization header with access_token", async () => {
      mockFetch.mockResolvedValueOnce(
        gqlOk({ app: { byFullName: { id: "proj-1", slug: "app" } } }),
      );

      await adapter.createProject({ name: "App", slug: "app" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.expo.dev/graphql",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-expo-token",
            "Content-Type": "application/json",
          }),
        }),
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /*  parseJsonOutput                                                  */
  /* ---------------------------------------------------------------- */

  describe("parseJsonOutput", () => {
    it("should handle JSON preceded by non-JSON text", () => {
      const parseJsonOutput = (adapter as any).parseJsonOutput.bind(adapter);
      const result = parseJsonOutput('Some warning text\n[{"id":"b1","status":"NEW"}]');
      expect(result).toEqual([{ id: "b1", status: "NEW" }]);
    });

    it("should handle pure JSON output", () => {
      const parseJsonOutput = (adapter as any).parseJsonOutput.bind(adapter);
      const result = parseJsonOutput('[{"id":"b2","status":"IN_PROGRESS"}]');
      expect(result).toEqual([{ id: "b2", status: "IN_PROGRESS" }]);
    });

    it("should handle object JSON output", () => {
      const parseJsonOutput = (adapter as any).parseJsonOutput.bind(adapter);
      const result = parseJsonOutput('{"id":"b3","status":"FINISHED"}');
      expect(result).toEqual({ id: "b3", status: "FINISHED" });
    });

    it("should throw on non-JSON output", () => {
      const parseJsonOutput = (adapter as any).parseJsonOutput.bind(adapter);
      expect(() => parseJsonOutput("Not JSON at all")).toThrow("EAS CLI output is not JSON");
    });
  });
});
