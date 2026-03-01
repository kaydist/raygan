import { Router, type IRouter } from "express";
import express from "express";

import { handleEASWebhook } from "../../controllers";

const router = Router();

router.post(
  "/webhooks/eas-build",
  express.raw({ type: "application/json" }),
  handleEASWebhook,
);

export const webhooksRoutes: IRouter = router;
