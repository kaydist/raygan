import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/auth";
import {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "../../controllers";

const router = Router();

router.get("/organizations", authenticate, listOrganizations);
router.post("/organizations", authenticate, createOrganization);
router.get("/organizations/:orgId", authenticate, getOrganization);
router.patch("/organizations/:orgId", authenticate, updateOrganization);
router.delete("/organizations/:orgId", authenticate, deleteOrganization);

router.get("/organizations/:orgId/members", authenticate, listMembers);
router.post("/organizations/:orgId/members", authenticate, inviteMember);
router.patch("/organizations/:orgId/members/:memberId", authenticate, updateMemberRole);
router.delete("/organizations/:orgId/members/:memberId", authenticate, removeMember);

export const organizationsRoutes: IRouter = router;
