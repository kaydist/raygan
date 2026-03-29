import { Router, type IRouter } from "express";

import { authenticate } from "../../middleware";
import {
  upsertProjectSetting,
  getProjectSetting,
  getProjectSettingsByCategory,
  deleteProjectSetting,
  verifyProjectSetting,
  upsertStoreListing,
  getStoreListing,
  createStoreRelease,
  listStoreReleases,
  getStoreRelease,
  cancelStoreRelease,
} from "../../controllers";

const router = Router();

// Project Settings (credentials, configs)
router.put("/projects/:projectId/settings/:category/:slug", authenticate, upsertProjectSetting);
router.get("/projects/:projectId/settings/:category/:slug", authenticate, getProjectSetting);
router.get("/projects/:projectId/settings/:category", authenticate, getProjectSettingsByCategory);
router.delete("/projects/:projectId/settings/:category/:slug", authenticate, deleteProjectSetting);
router.post("/projects/:projectId/settings/:category/:slug/verify", authenticate, verifyProjectSetting);

// Store Listings
router.put("/projects/:projectId/store/listing/:store", authenticate, upsertStoreListing);
router.get("/projects/:projectId/store/listing/:store", authenticate, getStoreListing);

// Store Releases
router.post("/projects/:projectId/store/releases", authenticate, createStoreRelease);
router.get("/projects/:projectId/store/releases", authenticate, listStoreReleases);
router.get("/projects/:projectId/store/releases/:releaseId", authenticate, getStoreRelease);
router.delete("/projects/:projectId/store/releases/:releaseId", authenticate, cancelStoreRelease);

export const storeReleasesRoutes: IRouter = router;
