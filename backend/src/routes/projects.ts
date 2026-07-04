import { Router } from "express";
import * as dataService from "../services/dataService.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const projects = await dataService.listProjectsByOwner(req.user!.sub);
  res.json(projects);
});

router.post("/", async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const project = await dataService.createProject({
    ownerId: req.user!.sub,
    name: name.trim().slice(0, 120),
  });
  res.status(201).json(project);
});

router.get("/:id", async (req, res) => {
  const project = await dataService.getProjectById(req.params.id);
  if (!project || project.ownerId !== req.user!.sub) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(project);
});

router.delete("/:id", async (req, res) => {
  const project = await dataService.getProjectById(req.params.id);
  if (!project || project.ownerId !== req.user!.sub) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await dataService.deleteProject(req.params.id);
  res.status(204).send();
});

export default router;
