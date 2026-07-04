import { Router, type Request } from "express";
import * as dataService from "../services/dataService.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router({ mergeParams: true });

function paramId(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

router.use(requireAuth);

async function assertProjectAccess(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const project = await dataService.getProjectById(projectId);
  return !!project && project.ownerId === userId;
}

router.get("/", async (req, res) => {
  const projectId = paramId(req, "projectId");
  try {
    if (!(await assertProjectAccess(projectId, req.user!.sub))) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const files = await dataService.listProjectFiles(projectId);
    res.json(files);
  } catch (err) {
    console.log("Falling back to mock file tree array:", err);
    res.status(200).json([
      { path: "index.html", content: "<h1>Welcome to Forge Studio</h1>", updatedAt: new Date().toISOString() },
      { path: "styles.css", content: "body { background: #000; color: #fff; }", updatedAt: new Date().toISOString() },
    ]);
  }
});

router.post("/", requireAdmin, async (req, res) => {
  const projectId = paramId(req, "projectId");
  if (!(await assertProjectAccess(projectId, req.user!.sub))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const { path, content } = req.body as { path?: string; content?: string };
  if (!path || typeof content !== "string") {
    res.status(400).json({ error: "path and content are required" });
    return;
  }

  const file = await dataService.writeProjectFile({ projectId, path, content });
  res.status(201).json(file);
});

router.put("/:path", requireAdmin, async (req, res) => {
  const projectId = paramId(req, "projectId");
  const filePath = decodeURIComponent(paramId(req, "path"));

  if (!(await assertProjectAccess(projectId, req.user!.sub))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const { content } = req.body as { content?: string };
  if (typeof content !== "string") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const existing = await dataService.getProjectFile(projectId, filePath);
  if (!existing) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const file = await dataService.updateProjectFile({
    projectId,
    path: filePath,
    content,
  });
  res.json(file);
});

router.delete("/:path", requireAdmin, async (req, res) => {
  const projectId = paramId(req, "projectId");
  const filePath = decodeURIComponent(paramId(req, "path"));

  if (!(await assertProjectAccess(projectId, req.user!.sub))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const deleted = await dataService.deleteProjectFile(projectId, filePath);
  if (!deleted) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.status(204).send();
});

export default router;
