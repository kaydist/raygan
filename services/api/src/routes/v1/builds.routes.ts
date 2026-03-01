import { Router, type IRouter } from "express";

import { authenticate } from "../../middleware";
import {
  triggerBuild,
  listBuilds,
  getBuild,
  cancelBuild,
} from "../../controllers";

const router = Router();

router.post("/projects/:projectId/builds", authenticate, triggerBuild);
router.get("/projects/:projectId/builds", authenticate, listBuilds);
router.get("/projects/:projectId/builds/:buildId", authenticate, getBuild);
router.delete("/projects/:projectId/builds/:buildId", authenticate, cancelBuild);

export const buildsRoutes: IRouter = router;
