import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { FORGE_SYSTEM_PROMPT } from "@/lib/generation-system-prompt";

type IncomingBody = {
  messages?: UIMessage[];
  projectId?: string;
  files?: Array<{ path: string; content: string }>;
  model?: string;
};

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as IncomingBody;
        const messages = body.messages;
        const projectId = body.projectId;

        if (!Array.isArray(messages) || !projectId) {
          return new Response("messages and projectId required", { status: 400 });
        }

        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        // Verify caller + get an authenticated Supabase client scoped to that user.
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            global: {
              headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_PUBLISHABLE_KEY! },
            },
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          },
        );
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

        // Confirm the project belongs to the user (RLS also enforces).
        const { data: proj } = await supabase
          .from("projects")
          .select("id")
          .eq("id", projectId)
          .maybeSingle();
        if (!proj) return new Response("Project not found", { status: 404 });

        // Persist the latest user message.
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          await supabase.from("chat_messages").insert({
            project_id: projectId,
            role: "user",
            parts: lastUser.parts as unknown as object,
          });
        }

        const fileList = (body.files ?? []).map((f) => `- ${f.path} (${f.content.length} chars)`).join("\n") || "(empty project)";
        const contextSystem = `Current virtual filesystem for project ${projectId}:\n${fileList}\n\nWhen editing, only rewrite files you actually change.`;

        const gateway = createLovableAiGatewayProvider(key);
        const modelName = body.model || "google/gemini-3-flash-preview";
        const model = gateway(modelName);

        const tools = {
          write_file: tool({
            description: "Create or overwrite a file in the project's virtual filesystem. Use for all HTML/CSS/JS content.",
            inputSchema: z.object({
              path: z.string().min(1).max(200).describe("File path, e.g. 'index.html'"),
              content: z.string().describe("Full file contents"),
            }),
            execute: async ({ path, content }) => {
              const { error } = await supabase.from("project_files").upsert(
                { project_id: projectId, path, content, updated_at: new Date().toISOString() },
                { onConflict: "project_id,path" },
              );
              if (error) return { ok: false, path, error: error.message };
              return { ok: true, path, bytes: content.length };
            },
          }),
          delete_file: tool({
            description: "Delete a file from the project.",
            inputSchema: z.object({ path: z.string().min(1).max(200) }),
            execute: async ({ path }) => {
              const { error } = await supabase
                .from("project_files")
                .delete()
                .eq("project_id", projectId)
                .eq("path", path);
              if (error) return { ok: false, path, error: error.message };
              return { ok: true, path };
            },
          }),
          chat_message: tool({
            description: "Send a short markdown message to the user summarising what you built or changed. Call at most once per turn, at the end.",
            inputSchema: z.object({ markdown: z.string().min(1).max(2000) }),
            execute: async ({ markdown }) => ({ ok: true, markdown }),
          }),
        };

        const result = streamText({
          model,
          system: `${FORGE_SYSTEM_PROMPT}\n\n${contextSystem}`,
          messages: convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(50),
          onFinish: async ({ response }) => {
            // Persist the assistant message for durable history.
            try {
              const lastAssistant = response.messages.filter((m) => m.role === "assistant").pop();
              if (lastAssistant) {
                await supabase.from("chat_messages").insert({
                  project_id: projectId,
                  role: "assistant",
                  parts: lastAssistant.content as unknown as object,
                });
              }
              await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);

              // Snapshot checkpoint
              const { data: files } = await supabase
                .from("project_files")
                .select("path, content")
                .eq("project_id", projectId);
              await supabase.from("checkpoints").insert({
                project_id: projectId,
                summary: null,
                files_snapshot: files ?? [],
              });
            } catch (e) {
              console.error("[generate] persist failed", e);
            }
          },
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
