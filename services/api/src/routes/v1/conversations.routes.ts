import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/auth";
import {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
} from "../../controllers";

const router = Router();

router.get("/projects/:projectId/conversations", authenticate, listConversations);
router.post("/projects/:projectId/conversations", authenticate, createConversation);
router.get("/conversations/:conversationId", authenticate, getConversation);
router.patch("/conversations/:conversationId", authenticate, updateConversation);
router.delete("/conversations/:conversationId", authenticate, deleteConversation);

export const conversationsRoutes: IRouter = router;
