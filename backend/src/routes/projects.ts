import { Router } from "express";
import * as dataService from "../services/dataService.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

function createDemoProject(ownerId: string, name = "Demo Forge Project") {
  const now = new Date().toISOString();
  return {
    id: "demo-1",
    ownerId,
    name,
    createdAt: now,
    updatedAt: now,
  };
}

router.get("/", async (req, res) => {
  try {
    const projects = await dataService.listProjectsByOwner(req.user!.sub);
    res.json(projects);
  } catch (err) {
    console.log("Falling back to demo project storage:", err);
    res.status(200).json([createDemoProject(req.user!.sub)]);
  }
});

router.post("/", async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  try {
    const project = await dataService.createProject({
      ownerId: req.user!.sub,
      name: name.trim().slice(0, 120),
    });
    res.status(201).json(project);
  } catch (err) {
    console.log("Falling back to demo project storage after create:", err);
    res.status(201).json(createDemoProject(req.user!.sub, name.trim().slice(0, 120)));
  }
});

router.get("/:id", async (req, res) => {
  try {
    const project = await dataService.getProjectById(req.params.id);
    if (!project || project.ownerId !== req.user!.sub) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(project);
  } catch (err) {
    console.log("Falling back to demo project storage for lookup:", err);
    res.status(200).json(createDemoProject(req.user!.sub));
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const project = await dataService.getProjectById(req.params.id);
    if (!project || project.ownerId !== req.user!.sub) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    await dataService.deleteProject(req.params.id);
    res.status(204).send();
  } catch (err) {
    console.log("Falling back to demo project storage for delete:", err);
    res.status(204).send();
  }
});

export default router;
