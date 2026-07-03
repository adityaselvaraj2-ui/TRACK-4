import {
  GoogleGenAI,
  type Content,
  type FunctionCall,
  type Part,
} from "@google/genai";
import { env } from "../config/env.js";
import { FORGE_SYSTEM_PROMPT } from "../prompts/generation-system-prompt.js";
import * as dataService from "./dataService.js";
import {
  fileToolDeclarations,
  type FileToolArgs,
  type FileToolName,
} from "../tools/fileTools.js";
import type { ToolEvent } from "../types/index.js";

const MODEL = "gemini-3.1-pro-preview";
const MAX_TURNS = 50;

export interface ChatGenerationResult {
  assistantMessage: string;
  toolEvents: ToolEvent[];
}

export interface StreamEvent {
  type: "text" | "tool" | "done" | "error";
  data: unknown;
}

function getClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: env.geminiApiKey });
}

function buildFileContext(files: Array<{ path: string; content: string }>): string {
  const fileList =
    files.map((f) => `- ${f.path} (${f.content.length} chars)`).join("\n") ||
    "(empty project)";
  return `Current virtual filesystem:\n${fileList}\n\nWhen editing, only rewrite files you actually change.`;
}

async function executeFileTool(
  name: FileToolName,
  args: FileToolArgs,
  projectId: string,
): Promise<{ ok: boolean; message: string }> {
  const path = args.path?.trim();
  if (!path) return { ok: false, message: "Missing path" };

  switch (name) {
    case "write_file": {
      if (typeof args.content !== "string") {
        return { ok: false, message: "Missing content" };
      }
      await dataService.writeProjectFile({ projectId, path, content: args.content });
      return { ok: true, message: `Wrote ${path}` };
    }
    case "update_file": {
      if (typeof args.content !== "string") {
        return { ok: false, message: "Missing content" };
      }
      const updated = await dataService.updateProjectFile({
        projectId,
        path,
        content: args.content,
      });
      if (!updated) return { ok: false, message: `File not found: ${path}` };
      return { ok: true, message: `Updated ${path}` };
    }
    case "delete_file": {
      const deleted = await dataService.deleteProjectFile(projectId, path);
      if (!deleted) return { ok: false, message: `File not found: ${path}` };
      return { ok: true, message: `Deleted ${path}` };
    }
    default:
      return { ok: false, message: `Unknown tool: ${name}` };
  }
}

function extractFunctionCalls(parts: Part[] | undefined): FunctionCall[] {
  if (!parts) return [];
  return parts
    .filter((p) => p.functionCall?.name)
    .map((p) => p.functionCall as FunctionCall);
}

function extractText(parts: Part[] | undefined): string {
  if (!parts) return "";
  return parts
    .filter((p) => typeof p.text === "string")
    .map((p) => p.text as string)
    .join("");
}

export async function runChatGeneration(input: {
  projectId: string;
  userMessage: string;
  files: Array<{ path: string; content: string }>;
  onEvent?: (event: StreamEvent) => void;
}): Promise<ChatGenerationResult> {
  const ai = getClient();
  const toolEvents: ToolEvent[] = [];
  let assistantText = "";

  const systemInstruction = `${FORGE_SYSTEM_PROMPT}\n\n${buildFileContext(input.files)}`;

  const history: Content[] = [
    {
      role: "user",
      parts: [{ text: input.userMessage }],
    },
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: history,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: fileToolDeclarations }],
      },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const functionCalls = extractFunctionCalls(parts);
    const textChunk = extractText(parts);

    if (textChunk) {
      assistantText += textChunk;
      input.onEvent?.({ type: "text", data: { text: textChunk } });
    }

    if (functionCalls.length === 0) {
      break;
    }

    // Append model turn with ALL functionCall parts from this inference
    if (candidate?.content) {
      history.push(candidate.content);
    }

    // Execute every functionCall from this turn (parallel when independent)
    const responseParts: Part[] = await Promise.all(
      functionCalls.map(async (call) => {
        const name = call.name as FileToolName;
        const args = (call.args ?? {}) as unknown as FileToolArgs;

        const pendingEvent: ToolEvent = {
          type: name === "delete_file" ? "delete_file" : name === "update_file" ? "update_file" : "write_file",
          path: args.path ?? "",
          status: "pending",
        };
        toolEvents.push(pendingEvent);
        input.onEvent?.({ type: "tool", data: pendingEvent });

        const result = await executeFileTool(name, args, input.projectId);

        pendingEvent.status = result.ok ? "success" : "error";
        pendingEvent.message = result.message;
        input.onEvent?.({ type: "tool", data: { ...pendingEvent } });

        return {
          functionResponse: {
            name: call.name,
            response: { result: result.message, ok: result.ok },
          },
        } satisfies Part;
      }),
    );

    history.push({ role: "user", parts: responseParts });
  }

  input.onEvent?.({ type: "done", data: { toolEvents, assistantMessage: assistantText } });
  return { assistantMessage: assistantText.trim(), toolEvents };
}
