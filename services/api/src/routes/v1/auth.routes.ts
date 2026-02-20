import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/auth";
import {
  register,
  login,
  oauthLogin,
  refreshToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  resendVerification,
  verifyEmail,
} from "../../controllers";

const router = Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/oauth", oauthLogin);
router.post("/auth/refresh", refreshToken);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password", resetPassword);
router.post("/auth/resend-verification", resendVerification);
router.post("/auth/verify-email", verifyEmail);
router.post("/auth/logout", authenticate, logout);
router.get("/auth/me", authenticate, getMe);

export const authRoutes: IRouter = router;
