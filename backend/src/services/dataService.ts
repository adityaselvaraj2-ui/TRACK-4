import { createClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';
import type {
  ChatMessageRecord,
  CheckpointRecord,
  ProjectFileRecord,
  ProjectRecord,
  UserRecord,
  UserRole,
} from '../types/index.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const fallbackUsers: UserRecord[] = [];
const fallbackProjects: ProjectRecord[] = [];
const fallbackFiles: ProjectFileRecord[] = [];
const fallbackMessages: ChatMessageRecord[] = [];
const fallbackCheckpoints: CheckpointRecord[] = [];

export const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

function fallback<T>(operation: () => Promise<T>, fallbackValue: T): Promise<T> {
  if (supabase) {
    return operation();
  }
  return Promise.resolve(fallbackValue);
}

function toProjectRecord(row: Record<string, unknown>): ProjectRecord {
  return {
    id: String(row.id ?? uuid()),
    ownerId: String(row.owner_id ?? row.ownerId ?? ''),
    name: String(row.name ?? ''),
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  };
}

function toFileRecord(row: Record<string, unknown>): ProjectFileRecord {
  return {
    projectId: String(row.project_id ?? row.projectId ?? ''),
    path: String(row.path ?? ''),
    content: String(row.content ?? ''),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  };
}

function toUserRecord(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id ?? uuid()),
    email: String(row.email ?? ''),
    passwordHash: String(row.password_hash ?? row.passwordHash ?? ''),
    role: (row.role as UserRole) ?? 'Viewer',
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
  };
}

function toChatMessageRecord(row: Record<string, unknown>): ChatMessageRecord {
  return {
    id: String(row.id ?? uuid()),
    projectId: String(row.project_id ?? row.projectId ?? ''),
    role: (row.role as ChatMessageRecord['role']) ?? 'assistant',
    content: String(row.content ?? ''),
    toolEvents: Array.isArray(row.tool_events) ? (row.tool_events as ChatMessageRecord['toolEvents']) : undefined,
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
  };
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  if (!supabase) {
    return fallbackUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  const { data, error } = await supabase.from('users').select('*').ilike('email', email).maybeSingle();

  if (error) throw error;
  return data ? toUserRecord(data as Record<string, unknown>) : null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  if (!supabase) {
    return fallbackUsers.find((u) => u.id === id) ?? null;
  }

  const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();

  if (error) throw error;
  return data ? toUserRecord(data as Record<string, unknown>) : null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  role: UserRole;
}): Promise<UserRecord> {
  if (!supabase) {
    const user: UserRecord = {
      id: uuid(),
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role,
      createdAt: new Date().toISOString(),
    };
    fallbackUsers.push(user);
    return user;
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: uuid(),
      email: input.email.toLowerCase(),
      password_hash: input.passwordHash,
      role: input.role,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return toUserRecord(data as Record<string, unknown>);
}

export async function listProjectsByOwner(ownerId: string): Promise<ProjectRecord[]> {
  if (!supabase) {
    return fallbackProjects.filter((project) => project.ownerId === ownerId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => toProjectRecord(row as Record<string, unknown>));
}

export async function getProjectById(id: string): Promise<ProjectRecord | null> {
  if (!supabase) {
    return fallbackProjects.find((project) => project.id === id) ?? null;
  }

  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();

  if (error) throw error;
  return data ? toProjectRecord(data as Record<string, unknown>) : null;
}

export async function createProject(input: {
  ownerId: string;
  name: string;
}): Promise<ProjectRecord> {
  if (!supabase) {
    const project: ProjectRecord = {
      id: uuid(),
      ownerId: input.ownerId,
      name: input.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fallbackProjects.push(project);
    return project;
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      id: uuid(),
      owner_id: input.ownerId,
      name: input.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return toProjectRecord(data as Record<string, unknown>);
}

export async function deleteProject(id: string): Promise<boolean> {
  if (!supabase) {
    const index = fallbackProjects.findIndex((project) => project.id === id);
    if (index >= 0) fallbackProjects.splice(index, 1);
    return true;
  }

  const { error } = await supabase.from('projects').delete().eq('id', id);

  if (error) throw error;
  return true;
}

export async function touchProject(id: string): Promise<void> {
  if (!supabase) {
    const project = fallbackProjects.find((entry) => entry.id === id);
    if (project) project.updatedAt = new Date().toISOString();
    return;
  }

  const { error } = await supabase
    .from('projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function listProjectFiles(projectId: string): Promise<ProjectFileRecord[]> {
  if (!supabase) {
    return fallbackFiles.filter((file) => file.projectId === projectId).sort((a, b) => a.path.localeCompare(b.path));
  }

  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('project_id', projectId)
    .order('path', { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => toFileRecord(row as Record<string, unknown>));
}

export async function getProjectFile(
  projectId: string,
  path: string,
): Promise<ProjectFileRecord | null> {
  if (!supabase) {
    return fallbackFiles.find((file) => file.projectId === projectId && file.path === path) ?? null;
  }

  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('project_id', projectId)
    .eq('path', path)
    .maybeSingle();

  if (error) throw error;
  return data ? toFileRecord(data as Record<string, unknown>) : null;
}

export async function writeProjectFile(input: {
  projectId: string;
  path: string;
  content: string;
}): Promise<ProjectFileRecord> {
  if (!supabase) {
    const existingIndex = fallbackFiles.findIndex((file) => file.projectId === input.projectId && file.path === input.path);
    const file: ProjectFileRecord = {
      projectId: input.projectId,
      path: input.path,
      content: input.content,
      updatedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) fallbackFiles[existingIndex] = file;
    else fallbackFiles.push(file);
    return file;
  }

  const { data, error } = await supabase
    .from('files')
    .upsert(
      [
        {
          project_id: input.projectId,
          path: input.path,
          content: input.content,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'project_id,path' },
    )
    .select()
    .single();

  if (error) throw error;
  return toFileRecord(data as Record<string, unknown>);
}

export async function updateProjectFile(input: {
  projectId: string;
  path: string;
  content: string;
}): Promise<ProjectFileRecord | null> {
  if (!supabase) {
    const existing = fallbackFiles.find((file) => file.projectId === input.projectId && file.path === input.path);
    if (!existing) return null;
    existing.content = input.content;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  const { data, error } = await supabase
    .from('files')
    .update({ content: input.content, updated_at: new Date().toISOString() })
    .eq('project_id', input.projectId)
    .eq('path', input.path)
    .select()
    .single();

  if (error) throw error;
  return data ? toFileRecord(data as Record<string, unknown>) : null;
}

export async function deleteProjectFile(
  projectId: string,
  path: string,
): Promise<boolean> {
  if (!supabase) {
    const index = fallbackFiles.findIndex((file) => file.projectId === projectId && file.path === path);
    if (index >= 0) fallbackFiles.splice(index, 1);
    return true;
  }

  const { error } = await supabase.from('files').delete().eq('project_id', projectId).eq('path', path);

  if (error) throw error;
  return true;
}

export async function listChatMessages(projectId: string): Promise<ChatMessageRecord[]> {
  if (!supabase) {
    return fallbackMessages.filter((message) => message.projectId === projectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => toChatMessageRecord(row as Record<string, unknown>));
}

export async function saveChatMessage(input: {
  projectId: string;
  role: ChatMessageRecord['role'];
  content: string;
  toolEvents?: ChatMessageRecord['toolEvents'];
}): Promise<ChatMessageRecord> {
  if (!supabase) {
    const message: ChatMessageRecord = {
      id: uuid(),
      projectId: input.projectId,
      role: input.role,
      content: input.content,
      toolEvents: input.toolEvents,
      createdAt: new Date().toISOString(),
    };
    fallbackMessages.push(message);
    return message;
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      id: uuid(),
      project_id: input.projectId,
      role: input.role,
      content: input.content,
      tool_events: input.toolEvents,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return toChatMessageRecord(data as Record<string, unknown>);
}

export async function canAccessProject(projectId: string, userId: string): Promise<boolean> {
  const project = await getProjectById(projectId);
  return !!project && project.ownerId === userId;
}

export async function listCheckpoints(projectId: string): Promise<CheckpointRecord[]> {
  if (!supabase) {
    return fallbackCheckpoints.filter((checkpoint) => checkpoint.projectId === projectId);
  }
  return [];
}

export async function getCheckpoint(projectId: string, checkpointId: string): Promise<CheckpointRecord | null> {
  if (!supabase) {
    return fallbackCheckpoints.find((checkpoint) => checkpoint.projectId === projectId && checkpoint.id === checkpointId) ?? null;
  }
  return null;
}

export async function createCheckpoint(input: { projectId: string; label: string; files: Array<{ path: string; content: string }> }): Promise<CheckpointRecord> {
  if (!supabase) {
    const checkpoint: CheckpointRecord = {
      id: uuid(),
      projectId: input.projectId,
      label: input.label,
      files: input.files,
      createdAt: new Date().toISOString(),
    };
    fallbackCheckpoints.push(checkpoint);
    return checkpoint;
  }
  return {
    id: uuid(),
    projectId: input.projectId,
    label: input.label,
    files: input.files,
    createdAt: new Date().toISOString(),
  };
}

export const dataService = {
  findUserByEmail,
  findUserById,
  createUser,
  listProjectsByOwner,
  getProjectById,
  createProject,
  deleteProject,
  touchProject,
  listProjectFiles,
  getProjectFile,
  writeProjectFile,
  updateProjectFile,
  deleteProjectFile,
  listChatMessages,
  saveChatMessage,
  async getProjects() {
    if (!supabase) {
      return fallbackProjects.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }

    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => toProjectRecord(row as Record<string, unknown>));
  },
  async getFilesByProject(projectId: string) {
    return listProjectFiles(projectId);
  },
  async writeFile(projectId: string, path: string, content: string) {
    return writeProjectFile({ projectId, path, content });
  },
  async updateFile(projectId: string, path: string, content: string) {
    return updateProjectFile({ projectId, path, content });
  },
  async deleteFile(projectId: string, path: string) {
    await deleteProjectFile(projectId, path);
    return { success: true };
  },
};
