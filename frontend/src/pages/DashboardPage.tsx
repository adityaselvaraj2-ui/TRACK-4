import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Trash2, LogOut, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { GradientBorder } from "@/components/brand/GradientBorder";
import { useAuth } from "@/context/AuthContext";
import { api, type Project, ApiError } from "@/lib/api";
import { toast } from "sonner";

export function DashboardPage() {
  const navigate = useNavigate();
  const { token, logout, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const list = await api.listProjects(token);
        setProjects(list);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to load projects");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleCreate = async () => {
    if (!token) return;
    setCreating(true);
    try {
      const name = prompt.trim().slice(0, 60) || "Untitled project";
      const project = await api.createProject(token, name);
      if (prompt.trim()) sessionStorage.setItem("forge:pendingPrompt", prompt.trim());
      setProjects((prev) => [project, ...prev]);
      navigate(`/workspace/${project.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!token || !confirm(`Delete "${name}"?`)) return;
    try {
      await api.deleteProject(token, id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Project deleted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-glass-border/60 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              {user?.email} · <span className="text-cyan">{user?.role}</span>
            </span>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Start something new</h1>
          <p className="mt-1 text-sm text-muted-foreground">Describe what you want. We'll spin up a workspace for it.</p>
        </div>

        {user?.role === "Admin" && (
          <GradientBorder active={prompt.length > 0} radius="rounded-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleCreate();
              }}
              className="flex flex-col gap-2 rounded-2xl p-3 sm:flex-row sm:items-end"
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A dark landing page for an AI notetaking app, with a pricing table"
                rows={2}
                className="flex-1 resize-none bg-transparent px-2 py-2 text-base placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-brand px-5 py-3 text-sm font-medium text-primary-foreground neon-border disabled:opacity-70"
              >
                {creating ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="size-4" /> New project</>}
              </button>
            </form>
          </GradientBorder>
        )}

        <div className="mt-14">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Your projects</h2>
            <span className="text-xs text-muted-foreground">{projects.length} total</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl glass p-14 text-center neon-border">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground">
                <ArrowRight className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Type a prompt above to spin up your first one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <motion.div key={p.id} layout>
                  <div className="group relative overflow-hidden rounded-2xl glass neon-border transition hover:-translate-y-0.5">
                    <Link to={`/workspace/${p.id}`} className="block">
                      <div className="relative aspect-[4/3] bg-gradient-to-br from-violet/40 to-cyan/30">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="size-8 text-white/70" />
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="truncate text-base font-semibold">{p.name}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Updated {new Date(p.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                    {user?.role === "Admin" && (
                      <button
                        onClick={() => void handleDelete(p.id, p.name)}
                        aria-label={`Delete ${p.name}`}
                        className="absolute right-2 top-2 rounded-lg bg-black/40 p-2 text-white/80 opacity-0 transition group-hover:opacity-100 hover:bg-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
