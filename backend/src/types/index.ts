export type UserRole = "Admin" | "Viewer";

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFileRecord {
  projectId: string;
  path: string;
  content: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: string;
  projectId: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolEvents?: ToolEvent[];
  createdAt: string;
}

export interface ToolEvent {
  type: "write_file" | "update_file" | "delete_file";
  path: string;
  status: "pending" | "success" | "error";
  message?: string;
}

export interface ChatRequestBody {
  projectId: string;
  message: string;
  files?: Array<{ path: string; content: string }>;
}

export interface CheckpointRecord {
  id: string;
  projectId: string;
  label?: string;
  files: Array<{ path: string; content: string }>;
  createdAt: string;
}
