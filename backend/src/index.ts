import { createApp } from "./app.js";
import { assertRuntimeEnv, env } from "./config/env.js";

assertRuntimeEnv();

const app = createApp();

app.listen(env.port, () => {
  console.log(`Forge API listening on http://localhost:${env.port}`);
});
