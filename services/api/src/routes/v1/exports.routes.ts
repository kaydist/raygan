import { Router, type IRouter } from "express";

import { authenticate } from "../../middleware/auth";
import { exportProjectZip } from "../../controllers";

const router = Router();

router.get("/projects/:projectId/export/zip", authenticate, exportProjectZip);

export const exportsRoutes: IRouter = router;
