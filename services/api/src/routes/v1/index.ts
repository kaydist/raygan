import { Router, type IRouter } from "express";

import { healthRoutes } from "./health.routes";
import { authRoutes } from "./auth.routes";
import { usersRoutes } from "./users.routes";
import { organizationsRoutes } from "./organizations.routes";
import { projectsRoutes } from "./projects.routes";
import { filesRoutes } from "./files.routes";
import { conversationsRoutes } from "./conversations.routes";
import { generateRoutes } from "./generate.routes";

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(usersRoutes);
router.use(organizationsRoutes);
router.use(projectsRoutes);
router.use(filesRoutes);
router.use(conversationsRoutes);
router.use(generateRoutes);

export const v1Routes: IRouter = router;
