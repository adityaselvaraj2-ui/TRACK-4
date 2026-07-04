import { createApp } from "./app.js";
import { assertRuntimeEnv, env } from "./config/env.js";

assertRuntimeEnv();

const app = createApp();

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("GLOBAL ERROR HANDLER caught:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message || "An unexpected error occurred",
    stack: process.env.NODE_ENV === "development" ? err.stack : {},
  });
});

app.listen(env.port, () => {
  console.log(`Forge API listening on http://localhost:${env.port}`);
});
