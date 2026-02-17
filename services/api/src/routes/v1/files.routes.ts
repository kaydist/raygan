import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/auth";
import {
  listFiles,
  getFile,
  getFileByPath,
  createFile,
  updateFile,
  deleteFile,
  bulkCreateFiles,
} from "../../controllers";

const router = Router();

router.get("/projects/:projectId/files", authenticate, listFiles);
router.get("/projects/:projectId/files/by-path", authenticate, getFileByPath);
router.post("/projects/:projectId/files", authenticate, createFile);
router.post("/projects/:projectId/files/bulk", authenticate, bulkCreateFiles);
router.get("/projects/:projectId/files/:fileId", authenticate, getFile);
router.patch("/projects/:projectId/files/:fileId", authenticate, updateFile);
router.delete("/projects/:projectId/files/:fileId", authenticate, deleteFile);

export const filesRoutes: IRouter = router;
