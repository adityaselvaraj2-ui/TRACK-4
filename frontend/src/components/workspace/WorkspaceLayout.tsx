import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type Panel = "chat" | "preview" | "code";

export function WorkspaceLayout({
  chat,
  preview,
  code,
}: {
  chat: React.ReactNode;
  preview: React.ReactNode;
  code: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const [activePanel, setActivePanel] = useState<Panel>("preview");
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isMobile) {
    return (
      <div className="grid flex-1 grid-cols-[minmax(320px,380px)_1fr_minmax(300px,420px)] overflow-hidden">
        <div className="border-r border-glass-border/60 overflow-hidden neon-border">{chat}</div>
        <div className="overflow-hidden">{preview}</div>
        <div className="border-l border-glass-border/60 overflow-hidden">{code}</div>
      </div>
    );
  }

  const panels: { id: Panel; label: string; content: React.ReactNode }[] = [
    { id: "chat", label: "Chat", content: chat },
    { id: "preview", label: "Preview", content: preview },
    { id: "code", label: "Code", content: code },
  ];

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-glass-border/60 px-3 py-2">
        <button
          onClick={() => setMenuOpen(true)}
          className="rounded-md p-2 text-muted-foreground hover:text-foreground"
          aria-label="Open panel menu"
        >
          <Menu className="size-5" />
        </button>
        <div className="inline-flex gap-1 rounded-lg glass p-0.5">
          {panels.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePanel(p.id)}
              className={cn(
                "rounded-md px-3 py-1 text-xs transition",
                activePanel === p.id ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-hidden">
        {panels.find((p) => p.id === activePanel)?.content}
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-md" onClick={() => setMenuOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-glass-border glass p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Panels</span>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            <nav className="mt-4 space-y-1">
              {panels.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePanel(p.id);
                    setMenuOpen(false);
                  }}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-left text-sm transition",
                    activePanel === p.id ? "bg-gradient-brand text-primary-foreground" : "hover:bg-white/5",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </nav>
          </aside>
        </>
      )}
    </div>
  );
}
