import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ChatPane } from "@/components/workspace/ChatPane";
import { CodePane } from "@/components/workspace/CodePane";
import { PreviewPane } from "@/components/workspace/PreviewPane";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { useAuth } from "@/context/AuthContext";
import { api, type ChatMessage, type Project, ApiError } from "@/lib/api";
import { useWorkspaceStore } from "@/store/workspace-store";
import { toast } from "sonner";

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { token, isAdmin } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const setFiles = useWorkspaceStore((s) => s.setFiles);
  const wsFiles = useWorkspaceStore((s) => s.files);
  const activePath = useWorkspaceStore((s) => s.activePath);
  const setActivePath = useWorkspaceStore((s) => s.setActivePath);
  const device = useWorkspaceStore((s) => s.device);
  const setDevice = useWorkspaceStore((s) => s.setDevice);
  const writeFile = useWorkspaceStore((s) => s.writeFile);

  useEffect(() => {
    if (!token || !projectId) return;

    void (async () => {
      try {
        const [proj, files, msgs] = await Promise.all([
          api.getProject(token, projectId),
          api.listFiles(token, projectId),
          api.listMessages(token, projectId),
        ]);
        setProject(proj);
        setFiles(files.map((f) => ({ path: f.path, content: f.content })));
        setMessages(msgs);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to load workspace");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, projectId, setFiles, navigate]);

  if (loading || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-glass-border/60 px-4 py-2 glass">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-1 rounded-md p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
          </Link>
          <Logo size={22} />
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-medium">{project.name}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {wsFiles.length} file{wsFiles.length === 1 ? "" : "s"} · Updated {new Date(project.updatedAt).toLocaleTimeString()}
        </div>
      </header>

      <WorkspaceLayout
        chat={
          <ChatPane
            projectId={projectId!}
            initialMessages={messages}
            disabled={!isAdmin}
          />
        }
        preview={
          <PreviewPane
            files={wsFiles}
            device={device}
            onDeviceChange={setDevice}
            activePath={activePath}
          />
        }
        code={
          <CodePane
            files={wsFiles}
            activePath={activePath}
            onSelect={setActivePath}
            readOnly={!isAdmin}
            onSave={async (path, content) => {
              if (!token) return;
              await api.saveFile(token, projectId!, path, content);
              writeFile(path, content);
            }}
          />
        }
      />
    </div>
  );
}
