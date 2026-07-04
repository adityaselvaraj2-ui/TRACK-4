import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import fileRoutes from "./routes/files.js";
import chatRoutes from "./routes/chat.js";
import checkpointRoutes from "./routes/checkpoints.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/projects/:projectId/files", fileRoutes);
  app.use("/api/projects/:projectId/chat", chatRoutes);
  app.use("/api/projects/:projectId/checkpoints", checkpointRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
