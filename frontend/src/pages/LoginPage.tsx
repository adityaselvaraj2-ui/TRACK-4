import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { GradientBorder } from "@/components/brand/GradientBorder";
import { ParticleField } from "@/components/brand/ParticleField";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(email, password, "Admin");
      login(result.token, result.user);
      toast.success(mode === "login" ? "Welcome back" : "Account created");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <ParticleField className="pointer-events-none absolute inset-0 h-full w-full opacity-40" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <Logo size={32} />
          </Link>
          <h1 className="mt-4 font-display text-2xl font-semibold text-gradient">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the Forge workspace with your credentials
          </p>
        </div>

        <GradientBorder active={email.length > 0 || password.length > 0} radius="rounded-2xl">
          <form onSubmit={submit} className="space-y-4 rounded-2xl p-6">
            <div>
              <label htmlFor="email" className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <Mail className="size-3" /> Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-glass-border bg-surface/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan/40 neon-border"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <Lock className="size-3" /> Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-glass-border bg-surface/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-magenta/40 neon-border"
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3 text-sm font-medium text-primary-foreground neon-border disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {mode === "login" ? "Sign in" : "Create account"}
                </>
              )}
            </button>
          </form>
        </GradientBorder>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className={cn("text-cyan hover:underline")}
          >
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
