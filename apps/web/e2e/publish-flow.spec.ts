import { test, expect, type Page } from "@playwright/test";

const PROJECT_ID = "test-project-uuid";
const BUILD_UUID = "build-uuid-001";
const API_BASE = "**/api/v1/**";

const MOCK_BUILD = {
  uuid: BUILD_UUID,
  status: "completed",
  profile: "production",
  platform: "android",
  distribution: "store",
  artifact_url: "https://example.com/build.apk",
  logs_url: "https://example.com/logs",
  app_version: "1.0.0",
  build_duration: 120,
  error_message: null,
  created_on: new Date().toISOString(),
  updated_on: new Date().toISOString(),
};

const MOCK_PROJECT = {
  uuid: PROJECT_ID,
  name: "Test App",
  slug: "test-app",
  description: "A test project",
  settings: {
    app_config: {
      version: "1.0.0",
      package_name: "com.test.app",
      icon_url: null,
    },
  },
  created_on: new Date().toISOString(),
  updated_on: new Date().toISOString(),
};

async function setupAPIMocks(page: Page) {
  // Mock project fetch
  await page.route(`**/api/v1/projects/${PROJECT_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: MOCK_PROJECT, error: null }),
    }),
  );

  // Mock builds list - returns one completed production build
  await page.route(`**/api/v1/projects/${PROJECT_ID}/builds*`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { builds: [MOCK_BUILD], total: 1 },
          error: null,
        }),
      });
    }
    return route.continue();
  });

  // Mock store credentials - initially no credentials
  await page.route(
    `**/api/v1/projects/${PROJECT_ID}/settings/store_credentials/**`,
    (route) => {
      const method = route.request().method();
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              is_encrypted: true,
              is_valid: true,
              last_verified_at: new Date().toISOString(),
            },
            error: null,
          }),
        });
      }
      if (method === "PUT") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { is_encrypted: true, is_valid: null },
            error: null,
          }),
        });
      }
      if (method === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { is_encrypted: true, is_valid: true },
            error: null,
          }),
        });
      }
      if (method === "DELETE") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: null, error: null }),
        });
      }
      return route.continue();
    },
  );

  // Mock store listing
  await page.route(
    `**/api/v1/projects/${PROJECT_ID}/store/listing/**`,
    (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              title: "Test App",
              short_description: "",
              full_description: "",
              category: "",
              privacy_policy_url: "",
              support_email: "",
              screenshots: [],
              feature_graphic_url: null,
            },
            error: null,
          }),
        });
      }
      if (route.request().method() === "PUT") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { title: "Test App" },
            error: null,
          }),
        });
      }
      return route.continue();
    },
  );

  // Mock store releases list
  await page.route(
    `**/api/v1/projects/${PROJECT_ID}/store/releases*`,
    (route) => {
      const method = route.request().method();
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { releases: [], total: 0 },
            error: null,
          }),
        });
      }
      if (method === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              uuid: "release-uuid-001",
              project_id: PROJECT_ID,
              build_uuid: BUILD_UUID,
              store: "google_play",
              track: "internal",
              status: "pending",
              created_on: new Date().toISOString(),
            },
            error: null,
          }),
        });
      }
      return route.continue();
    },
  );

  // Mock settings fetch
  await page.route("**/api/v1/settings*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {}, error: null }),
    }),
  );

  // Mock auth / user
  await page.route("**/api/v1/auth/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { uuid: "user-uuid", email: "test@example.com" },
        error: null,
      }),
    }),
  );
}

/**
 * Helper to open the deploy modal by evaluating Zustand store directly.
 * This avoids needing to navigate the full workspace UI.
 */
async function openDeployModal(page: Page) {
  await page.evaluate(() => {
    // Trigger the deploy modal via Zustand store on window
    const event = new CustomEvent("open-deploy-modal");
    window.dispatchEvent(event);
  });

  // Fallback: click the modal trigger if it exists in the DOM
  const buildButton = page.getByRole("button", { name: /build apk/i });
  const releaseButton = page.getByText("Release to Store");

  // If DeployActions is visible, we're in the modal
  if (await releaseButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    return;
  }

  // Try clicking any deploy trigger in the toolbar/activity bar
  const deployTrigger = page
    .locator('[data-testid="deploy-trigger"], button:has-text("Deploy"), button:has-text("Build")')
    .first();
  if (await deployTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
    await deployTrigger.click();
  }
}

test.describe("Publish / Release to Store Flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupAPIMocks(page);
  });

  test("deploy actions panel shows all action buttons", async ({ page }) => {
    await page.goto(`/workspace/${PROJECT_ID}`);
    await openDeployModal(page);

    // Verify all 4 action buttons are present
    await expect(page.getByText("Build APK/IPA")).toBeVisible();
    await expect(page.getByText("Export Project")).toBeVisible();
    await expect(page.getByText("Release to Store")).toBeVisible();
    await expect(page.getByText("Push OTA Update")).toBeVisible();
  });

  test("release to store button shows GOOGLE PLAY when production build exists", async ({
    page,
  }) => {
    await page.goto(`/workspace/${PROJECT_ID}`);
    await openDeployModal(page);

    const releaseButton = page
      .locator("button")
      .filter({ hasText: "Release to Store" });
    await expect(releaseButton).toBeEnabled();
    await expect(page.getByText("GOOGLE PLAY")).toBeVisible();
  });

  test("release to store button is disabled without production build", async ({
    page,
  }) => {
    // Override builds mock to return no production builds
    await page.route(
      `**/api/v1/projects/${PROJECT_ID}/builds*`,
      (route) => {
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: {
                builds: [{ ...MOCK_BUILD, profile: "preview", status: "completed" }],
                total: 1,
              },
              error: null,
            }),
          });
        }
        return route.continue();
      },
    );

    await page.goto(`/workspace/${PROJECT_ID}`);
    await openDeployModal(page);

    const releaseButton = page
      .locator("button")
      .filter({ hasText: "Release to Store" });
    await expect(releaseButton).toBeDisabled();
    await expect(page.getByText("BUILD FIRST")).toBeVisible();
  });

  test("release wizard - step 1: select production build", async ({
    page,
  }) => {
    await page.goto(`/workspace/${PROJECT_ID}`);
    await openDeployModal(page);

    // Click Release to Store
    await page
      .locator("button")
      .filter({ hasText: "Release to Store" })
      .click();

    // Verify we're in step 1
    await expect(page.getByText("Release to Google Play")).toBeVisible();
    await expect(page.getByText("Step 1 of 5: Select Build")).toBeVisible();

    // Verify production build is listed
    await expect(page.getByText("Production Build")).toBeVisible();
    await expect(page.getByText("v1.0.0")).toBeVisible();

    // Continue button should be disabled until build selected
    const continueBtn = page.getByRole("button", { name: "Continue" });
    await expect(continueBtn).toBeDisabled();

    // Select the build
    await page.getByText("Production Build").click();

    // Continue should now be enabled
    await expect(continueBtn).toBeEnabled();
  });

  test("release wizard - step 2: store credentials configured", async ({
    page,
  }) => {
    await page.goto(`/workspace/${PROJECT_ID}`);
    await openDeployModal(page);

    // Enter release wizard
    await page
      .locator("button")
      .filter({ hasText: "Release to Store" })
      .click();

    // Select build and continue
    await page.getByText("Production Build").click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: Credentials
    await expect(
      page.getByText("Step 2 of 5: Store Credentials"),
    ).toBeVisible();
    await expect(page.getByText("Credentials configured")).toBeVisible();

    // Verify and Replace buttons should be visible
    await expect(
      page.getByRole("button", { name: /verify/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /replace/i }),
    ).toBeVisible();

    // Continue should be enabled since credentials exist
    await expect(
      page.getByRole("button", { name: "Continue" }),
    ).toBeEnabled();
  });

  test("release wizard - step 3: store listing form", async ({ page }) => {
    await page.goto(`/workspace/${PROJECT_ID}`);
    await openDeployModal(page);

    // Navigate to step 3
    await page
      .locator("button")
      .filter({ hasText: "Release to Store" })
      .click();
    await page.getByText("Production Build").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: Store Listing
    await expect(
      page.getByText("Step 3 of 5: Store Listing"),
    ).toBeVisible();

    // Verify form fields
    const titleInput = page.locator("#listing-title");
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue("Test App");

    await expect(page.locator("#listing-short")).toBeVisible();
    await expect(page.locator("#listing-full")).toBeVisible();
    await expect(page.locator("#listing-category")).toBeVisible();
    await expect(page.locator("#listing-email")).toBeVisible();
    await expect(page.locator("#listing-privacy")).toBeVisible();

    // Fill in listing details
    await page.locator("#listing-short").fill("A great test app");
    await page
      .locator("#listing-full")
      .fill("This app does amazing things for testing.");
    await page.locator("#listing-category").fill("Productivity");
    await page.locator("#listing-email").fill("support@testapp.com");
    await page
      .locator("#listing-privacy")
      .fill("https://testapp.com/privacy");

    // Character count should update for title
    await expect(page.getByText("(8/50)")).toBeVisible();
  });

  test("release wizard - step 4: select release track", async ({ page }) => {
    await page.goto(`/workspace/${PROJECT_ID}`);
    await openDeployModal(page);

    // Navigate to step 4
    await page
      .locator("button")
      .filter({ hasText: "Release to Store" })
      .click();
    await page.getByText("Production Build").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 4: Release Track
    await expect(
      page.getByText("Step 4 of 5: Release Track"),
    ).toBeVisible();

    // Verify all track options
    await expect(page.getByText("Internal Testing")).toBeVisible();
    await expect(page.getByText("Closed Testing (Alpha)")).toBeVisible();
    await expect(page.getByText("Open Testing (Beta)")).toBeVisible();
    await expect(page.getByText("Production")).toBeVisible();

    // Internal should be selected by default
    const internalOption = page
      .locator("button")
      .filter({ hasText: "Internal Testing" });
    await expect(internalOption).toHaveClass(/ring/);

    // Select production track
    await page
      .locator("button")
      .filter({ hasText: /^Production$/ })
      .click();

    // Warning banner should appear for first release to production
    await expect(
      page.getByText(/first-time releases to production/i),
    ).toBeVisible();

    // Switch back to internal
    await page
      .locator("button")
      .filter({ hasText: "Internal Testing" })
      .click();

    // Warning should disappear
    await expect(
      page.getByText(/first-time releases to production/i),
    ).not.toBeVisible();
  });

  test("release wizard - step 5: review and submit", async ({ page }) => {
    await page.goto(`/workspace/${PROJECT_ID}`);
    await openDeployModal(page);

    // Navigate to step 5
    await page
      .locator("button")
      .filter({ hasText: "Release to Store" })
      .click();
    await page.getByText("Production Build").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 5: Review & Submit
    await expect(
      page.getByText("Step 5 of 5: Review & Submit"),
    ).toBeVisible();

    // Verify review summary
    await expect(page.getByText("Google Play")).toBeVisible();
    await expect(page.getByText("Internal Testing")).toBeVisible();
    await expect(page.getByText("Android")).toBeVisible();
    await expect(page.getByText(/v1\.0\.0/)).toBeVisible();

    // Submit button should be visible
    const submitButton = page.getByRole("button", {
      name: /submit to google play/i,
    });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test("release wizard - full flow: submit to store", async ({ page }) => {
    let releaseSubmitted = false;

    // Track the release creation request
    await page.route(
      `**/api/v1/projects/${PROJECT_ID}/store/releases*`,
      (route) => {
        const method = route.request().method();
        if (method === "POST") {
          releaseSubmitted = true;
          const body = route.request().postDataJSON();
          expect(body.build_uuid).toBe(BUILD_UUID);
          expect(body.store).toBe("google_play");
          expect(body.track).toBe("internal");

          return route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              data: {
                uuid: "release-uuid-001",
                project_id: PROJECT_ID,
                build_uuid: BUILD_UUID,
                store: "google_play",
                track: "internal",
                status: "pending",
                created_on: new Date().toISOString(),
              },
              error: null,
            }),
          });
        }
        if (method === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: { releases: [], total: 0 },
              error: null,
            }),
          });
        }
        return route.continue();
      },
    );

    await page.goto(`/workspace/${PROJECT_ID}`);
    await openDeployModal(page);

    // Step 1: Select build
    await page
      .locator("button")
      .filter({ hasText: "Release to Store" })
      .click();
    await page.getByText("Production Build").click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: Credentials (already configured)
    await expect(page.getByText("Credentials configured")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: Store listing
    await page.locator("#listing-short").fill("Best test app ever");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 4: Track (internal default)
    await expect(page.getByText("Internal Testing")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 5: Review & Submit
    await expect(
      page.getByText("Step 5 of 5: Review & Submit"),
    ).toBeVisible();

    // Submit
    await page
      .getByRole("button", { name: /submit to google play/i })
      .click();

    // Verify the API was called
    expect(releaseSubmitted).toBe(true);
  });

  test("release wizard - back navigation works", async ({ page }) => {
    await page.goto(`/workspace/${PROJECT_ID}`);
    await openDeployModal(page);

    // Enter release wizard
    await page
      .locator("button")
      .filter({ hasText: "Release to Store" })
      .click();
    await expect(page.getByText("Step 1 of 5")).toBeVisible();

    // Go to step 2
    await page.getByText("Production Build").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Step 2 of 5")).toBeVisible();

    // Go back to step 1
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("Step 1 of 5")).toBeVisible();

    // Back from step 1 should exit to deploy actions
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText("Share with your audience")).toBeVisible();
  });

  test("release wizard - empty builds shows empty state", async ({
    page,
  }) => {
    // Override with no builds
    await page.route(
      `**/api/v1/projects/${PROJECT_ID}/builds*`,
      (route) => {
        if (route.request().method() === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: { builds: [], total: 0 },
              error: null,
            }),
          });
        }
        return route.continue();
      },
    );

    // Also override store releases to return empty so release button works
    await page.route(
      `**/api/v1/projects/${PROJECT_ID}/store/releases*`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { releases: [], total: 0 },
            error: null,
          }),
        }),
    );

    await page.goto(`/workspace/${PROJECT_ID}`);
    await openDeployModal(page);

    // Release to Store should be disabled
    const releaseButton = page
      .locator("button")
      .filter({ hasText: "Release to Store" });
    await expect(releaseButton).toBeDisabled();
  });

  test("release wizard - step 4 production warning for first release", async ({
    page,
  }) => {
    await page.goto(`/workspace/${PROJECT_ID}`);
    await openDeployModal(page);

    // Navigate to step 4
    await page
      .locator("button")
      .filter({ hasText: "Release to Store" })
      .click();
    await page.getByText("Production Build").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Select production track
    await page
      .locator("button")
      .filter({ hasText: /^Production$/ })
      .click();

    // Warning should appear (first release + production track)
    await expect(
      page.getByText(
        /first-time releases to production may be rejected/i,
      ),
    ).toBeVisible();
  });
});
