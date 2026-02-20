import { Router, type Router as RouterType } from "express";

const router: RouterType = Router();

/**
 * GET /api/v1/health
 * Health check endpoint
 */
router.get("/health", (_req, res) => {
  res.json({
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.0.0",
    },
    error: null,
  });
});

/**
 * GET /api/v1/health/ready
 * Readiness check (for k8s/docker health probes)
 */
router.get("/health/ready", (_req, res) => {
  // TODO: Add database and redis connectivity checks
  res.json({
    data: {
      ready: true,
      checks: {
        database: "ok", // placeholder
        redis: "ok", // placeholder
      },
    },
    error: null,
  });
});

export const healthRoutes = router;
