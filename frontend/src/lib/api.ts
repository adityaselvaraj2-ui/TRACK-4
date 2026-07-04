const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export type UserRole = "Admin" | "Viewer";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  projectId: string;
  path: string;
  content: string;
  updatedAt: string;
}

export interface ToolEvent {
  type: "write_file" | "update_file" | "delete_file";
  path: string;
  status: "pending" | "success" | "error";
  message?: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolEvents?: ToolEvent[];
  createdAt: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? res.statusText, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  register: (email: string, password: string, role: UserRole = "Admin") =>
    request<{ token: string; user: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  listProjects: (token: string) =>
    request<Project[]>("/api/projects", { token }),

  createProject: (token: string, name: string) =>
    request<Project>("/api/projects", {
      method: "POST",
      token,
      body: JSON.stringify({ name }),
    }),

  getProject: (token: string, id: string) =>
    request<Project>(`/api/projects/${id}`, { token }),

  deleteProject: (token: string, id: string) =>
    request<void>(`/api/projects/${id}`, { method: "DELETE", token }),

  listFiles: (token: string, projectId: string) =>
    request<ProjectFile[]>(`/api/projects/${projectId}/files`, { token }),

  saveFile: (token: string, projectId: string, path: string, content: string) =>
    request<ProjectFile>(`/api/projects/${projectId}/files`, {
      method: "POST",
      token,
      body: JSON.stringify({ path, content }),
    }),

  listMessages: (token: string, projectId: string) =>
    request<ChatMessage[]>(`/api/projects/${projectId}/chat/messages`, { token }),

  generateChat: async (
    token: string,
    projectId: string,
    message: string,
    files: Array<{ path: string; content: string }>,
    onEvent?: (event: { type: string; data: unknown }) => void,
  ) => {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/chat/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ projectId, message, files }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new ApiError(body.error ?? res.statusText, res.status);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response stream");

    const decoder = new TextDecoder();
    let buffer = "";
    let result: { message: ChatMessage; toolEvents: ToolEvent[] } | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const lines = chunk.split("\n");
        let eventType = "message";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7);
          if (line.startsWith("data: ")) data = line.slice(6);
        }

        if (!data) continue;
        const parsed = JSON.parse(data) as unknown;
        onEvent?.({ type: eventType, data: parsed });

        if (eventType === "done") {
          result = parsed as { message: ChatMessage; toolEvents: ToolEvent[] };
        }
        if (eventType === "error") {
          const err = parsed as { error: string };
          throw new Error(err.error);
        }
      }
    }

    if (!result) throw new Error("Stream ended without result");
    return result;
  },
};

export { ApiError };
