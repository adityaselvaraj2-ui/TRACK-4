import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Shield, Code2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ParticleField } from "@/components/brand/ParticleField";
import { GradientBorder } from "@/components/brand/GradientBorder";

export function IndexPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ParticleField className="pointer-events-none absolute inset-0 h-full w-full opacity-60" />

      <header className="relative z-10 border-b border-glass-border/40 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link
              to="/login"
              className="rounded-xl bg-gradient-brand px-4 py-2 text-sm font-medium text-primary-foreground neon-border"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/5 px-3 py-1 text-xs text-cyan">
            <Sparkles className="size-3.5" />
            AI-powered website builder
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold tracking-tight sm:text-6xl">
            Forge your next site
            <span className="block text-gradient">in minutes, not weeks</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Describe what you want. Forge generates production-quality HTML, live preview, and editable code — all in one workspace.
          </p>

          <div className="mt-10">
            <GradientBorder active radius="rounded-2xl">
              <div className="flex flex-col items-center gap-4 rounded-2xl p-6 sm:flex-row">
                <p className="flex-1 text-left text-sm text-muted-foreground">
                  Start with a prompt — dark landing pages, SaaS sites, portfolios, and more.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-medium text-primary-foreground neon-border"
                >
                  Launch Forge <ArrowRight className="size-4" />
                </Link>
              </div>
            </GradientBorder>
          </div>
        </motion.div>

        <div className="mt-24 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Zap, title: "Instant generation", desc: "Gemini 2.5 Flash writes complete, self-contained HTML files." },
            { icon: Code2, title: "Live workspace", desc: "Chat, preview, and Monaco editor in a unified split view." },
            { icon: Shield, title: "Role-based access", desc: "Admin and Viewer roles with JWT-secured API endpoints." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="rounded-2xl border border-glass-border glass p-6 neon-border"
            >
              <f.icon className="size-6 text-cyan" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-glass-border/40 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Forge Studio. Built for creators.
      </footer>
    </div>
  );
}
