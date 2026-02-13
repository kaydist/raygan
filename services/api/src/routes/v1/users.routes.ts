import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/auth";
import { getProfile, updateProfile, completeOnboarding, deleteAccount, switchOrganization } from "../../controllers";

const router = Router();

router.get("/users/me", authenticate, getProfile);
router.patch("/users/me", authenticate, updateProfile);
router.post("/users/me/onboarding", authenticate, completeOnboarding);
router.post("/users/me/switch-organization", authenticate, switchOrganization);
router.delete("/users/me", authenticate, deleteAccount);

export const usersRoutes: IRouter = router;
