import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/auth";
import { listModels, generate, streamGenerate, generateForProject } from "../../controllers";

const router = Router();

router.get("/models", authenticate, listModels);
router.post("/generate", authenticate, generate);
router.post("/generate/stream", authenticate, streamGenerate);
router.post("/projects/:projectId/generate", authenticate, generateForProject);

export const generateRoutes: IRouter = router;
