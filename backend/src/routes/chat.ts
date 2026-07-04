import { Router, type Request } from "express";
import * as dataService from "../services/dataService.js";
import { runChatGeneration } from "../services/aiService.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import type { ChatRequestBody } from "../types/index.js";

const router = Router({ mergeParams: true });

function paramId(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val;
}

router.use(requireAuth);
router.use(requireAdmin);

async function assertProjectAccess(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const project = await dataService.getProjectById(projectId);
  return !!project && project.ownerId === userId;
}

router.get("/messages", async (req, res) => {
  const projectId = paramId(req, "projectId");
  if (!(await assertProjectAccess(projectId, req.user!.sub))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const messages = await dataService.listChatMessages(projectId);
  res.json(messages);
});

router.post("/generate", async (req, res) => {
  const projectId = paramId(req, "projectId");
  if (!(await assertProjectAccess(projectId, req.user!.sub))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const body = req.body as ChatRequestBody;
  if (!body.message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const files =
    body.files ??
    (await dataService.listProjectFiles(projectId)).map((f) => ({
      path: f.path,
      content: f.content,
    }));

  await dataService.saveChatMessage({
    projectId,
    role: "user",
    content: body.message.trim(),
  });

  const accept = req.headers.accept ?? "";
  const wantsStream = accept.includes("text/event-stream");

  if (wantsStream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await runChatGeneration({
        projectId,
        userMessage: body.message.trim(),
        files,
        onEvent: (evt) => {
          if (evt.type === "text") send("text", evt.data);
          if (evt.type === "tool") send("tool", evt.data);
        },
      });

      const assistant = await dataService.saveChatMessage({
        projectId,
        role: "assistant",
        content: result.assistantMessage,
        toolEvents: result.toolEvents,
      });

      send("done", { message: assistant, toolEvents: result.toolEvents });
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      send("error", { error: message });
      res.end();
    }
    return;
  }

  try {
    const result = await runChatGeneration({
      projectId,
      userMessage: body.message.trim(),
      files,
    });

    const assistant = await dataService.saveChatMessage({
      projectId,
      role: "assistant",
      content: result.assistantMessage,
      toolEvents: result.toolEvents,
    });

    res.json({
      message: assistant,
      toolEvents: result.toolEvents,
      files: await dataService.listProjectFiles(projectId),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    res.status(500).json({ error: message });
  }
});

export default router;
