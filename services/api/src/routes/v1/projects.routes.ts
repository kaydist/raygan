import { Router, type IRouter } from "express";
import { authenticate } from "../../middleware/auth";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
  unarchiveProject,
  deleteProject,
  updateAst,
  updateFileTree,
} from "../../controllers";

const router = Router();

router.get("/projects", authenticate, listProjects);
router.post("/projects", authenticate, createProject);
router.get("/projects/:projectId", authenticate, getProject);
router.patch("/projects/:projectId", authenticate, updateProject);
router.delete("/projects/:projectId", authenticate, deleteProject);

router.post("/projects/:projectId/archive", authenticate, archiveProject);
router.post("/projects/:projectId/unarchive", authenticate, unarchiveProject);
router.patch("/projects/:projectId/ast", authenticate, updateAst);
router.patch("/projects/:projectId/file-tree", authenticate, updateFileTree);

export const projectsRoutes: IRouter = router;
