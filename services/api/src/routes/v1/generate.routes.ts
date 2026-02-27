import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/auth";
import { listModels, generate, streamGenerate, generateForProject, approvePlan, rejectPlan } from "../../controllers";

const router = Router();

router.get("/models", authenticate, listModels);
router.post("/generate", authenticate, generate);
router.post("/generate/stream", authenticate, streamGenerate);
router.post("/generate/plans/:planId/approve", authenticate, approvePlan);
router.post("/generate/plans/:planId/reject", authenticate, rejectPlan);
router.post("/projects/:projectId/generate", authenticate, generateForProject);

export const generateRoutes: IRouter = router;
