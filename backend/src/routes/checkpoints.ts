import { Router, type Request } from "express";
import * as dataService from "../services/dataService.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router({ mergeParams: true });

function paramId(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  const projectId = paramId(req, "projectId");
  if (!(await dataService.canAccessProject(projectId, req.user!.sub))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const checkpoints = await dataService.listCheckpoints(projectId);
  res.json(checkpoints);
});

router.post("/", async (req, res) => {
  const projectId = paramId(req, "projectId");
  if (!(await dataService.canAccessProject(projectId, req.user!.sub))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const { label } = req.body as { label?: string };
  const files = await dataService.listProjectFiles(projectId);
  const checkpoint = await dataService.createCheckpoint({
    projectId,
    label: label?.trim() || "snapshot",
    files: files.map((file) => ({ path: file.path, content: file.content })),
  });
  res.status(201).json(checkpoint);
});

router.post("/:checkpointId/restore", async (req, res) => {
  const projectId = paramId(req, "projectId");
  if (!(await dataService.canAccessProject(projectId, req.user!.sub))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const checkpoint = await dataService.getCheckpoint(projectId, req.params.checkpointId);
  if (!checkpoint) {
    res.status(404).json({ error: "Checkpoint not found" });
    return;
  }

  await Promise.all(
    checkpoint.files.map((file) =>
      dataService.writeProjectFile({ projectId, path: file.path, content: file.content }),
    ),
  );

  res.json({ restored: true, checkpoint });
});

export default router;
