import { Router } from "express";

import { healthRoutes } from "./health.routes";

const router = Router();

// Health check routes
router.use(healthRoutes);

// Project routes will be added in Day 3
// router.use('/projects', projectRoutes);

// Generate routes will be added in Day 6
// router.use('/generate', generateRoutes);

export const v1Routes = router;
