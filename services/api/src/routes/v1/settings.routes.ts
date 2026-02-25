import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/auth";
import { getPublicSettings } from "../../controllers";

const router = Router();

router.get("/settings", authenticate, getPublicSettings);

export const settingsRoutes: IRouter = router;
