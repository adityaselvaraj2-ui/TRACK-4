import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Loader2, Sparkles, User, MessageSquare } from "lucide-react";
import { GradientBorder } from "@/components/brand/GradientBorder";
import { ActionStatusCard } from "@/components/workspace/ActionStatusCard";
import { ParameterModal } from "@/components/workspace/ParameterModal";
import { useAuth } from "@/context/AuthContext";
import { api, type ChatMessage, type ToolEvent } from "@/lib/api";
import { useWorkspaceStore } from "@/store/workspace-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolEvents?: ToolEvent[];
}

export function ChatPane({
  projectId,
  initialMessages,
  disabled = false,
}: {
  projectId: string;
  initialMessages: ChatMessage[];
  disabled?: boolean;
}) {
  const { token } = useAuth();
  const files = useWorkspaceStore((s) => s.files);
  const deleteFile = useWorkspaceStore((s) => s.deleteFile);

  const [messages, setMessages] = useState<LocalMessage[]>(() =>
    initialMessages.map((m) => ({
      id: m.id,
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
      toolEvents: m.toolEvents,
    })),
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveTools, setLiveTools] = useState<ToolEvent[]>([]);
  const [paramModal, setParamModal] = useState<{
    message: string;
    params: { key: string; label: string; placeholder?: string }[];
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, liveTools, isLoading]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  useEffect(() => {
    const pending = sessionStorage.getItem("forge:pendingPrompt");
    if (pending && messages.length === 0 && !isLoading && !disabled && token) {
      sessionStorage.removeItem("forge:pendingPrompt");
      void sendMessage(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, token]);

  const runGeneration = async (text: string) => {
    if (!token) return;

    const userMsg: LocalMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setLiveTools([]);

    const optimisticTools: ToolEvent[] = [];

    try {
      const result = await api.generateChat(
        token,
        projectId,
        text,
        useWorkspaceStore.getState().files,
        ({ type, data }) => {
          if (type === "tool") {
            const evt = data as ToolEvent;
            optimisticTools.push(evt);
            setLiveTools([...optimisticTools]);

            if (evt.status === "success") {
              if (evt.type === "delete_file") {
                deleteFile(evt.path);
              }
            }
          }
        },
      );

      // Refresh files from server after generation
      const serverFiles = await api.listFiles(token, projectId);
      useWorkspaceStore.getState().setFiles(
        serverFiles.map((f) => ({ path: f.path, content: f.content })),
      );

      setMessages((prev) => [
        ...prev,
        {
          id: result.message.id,
          role: "assistant",
          content: result.message.content,
          toolEvents: result.toolEvents,
        },
      ]);
      setLiveTools([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
      setLiveTools([]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || disabled) return;

    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    await runGeneration(trimmed);
  };

  const submit = () => {
    const t = input.trim();
    if (!t) return;

    const missing: { key: string; label: string; placeholder?: string }[] = [];
    if (t.includes("[project-name]") && !t.replace("[project-name]", "").trim()) {
      missing.push({ key: "projectName", label: "Project name", placeholder: "My landing page" });
    }
    if (t.length < 3) {
      missing.push({ key: "details", label: "More details", placeholder: "Describe what you want to build" });
    }

    if (missing.length > 0) {
      setParamModal({ message: t, params: missing });
      return;
    }

    setInput("");
    void sendMessage(t);
  };

  const fileCount = useMemo(() => files.length, [files]);

  if (disabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background p-6 text-center">
        <MessageSquare className="size-8 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Chat is disabled for Viewer accounts. Contact an admin for write access.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col bg-background">
        <div className="flex items-center justify-between border-b border-glass-border/60 px-3 py-2 panel-active">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <MessageSquare className="size-3.5 text-cyan" />
            Chat Console
          </div>
          <span className="rounded-full border border-cyan/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan">
            Gemini 2.5 Flash
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {messages.length === 0 && !isLoading && (
            <div className="mx-auto max-w-sm py-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground neon-border">
                <Sparkles className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">Describe what you want to build</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Forge will generate real HTML you can see and edit in the panes to the right.
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MessageBubble message={m} />
              </motion.div>
            ))}
          </AnimatePresence>

          {liveTools.length > 0 && (
            <div className="flex flex-col gap-2">
              {liveTools.map((evt, i) => (
                <ActionStatusCard key={`${evt.path}-${i}`} event={evt} />
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin text-cyan" />
              <span className="animate-pulse-glow">Forging your site…</span>
            </div>
          )}
        </div>

        <div className="border-t border-glass-border/60 p-3">
          <GradientBorder active={isLoading || input.length > 0} radius="rounded-xl">
            <div className="flex items-end gap-2 rounded-xl p-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={messages.length === 0 ? "Describe the site you want…" : "Ask for a change…"}
                rows={1}
                disabled={isLoading}
                className="flex-1 max-h-40 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={submit}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition",
                  input.trim() && !isLoading
                    ? "bg-gradient-brand text-primary-foreground hover:scale-[1.03] neon-border"
                    : "bg-white/5 text-muted-foreground/60",
                )}
                aria-label="Send"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
              </button>
            </div>
          </GradientBorder>
          <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
            {fileCount > 0 ? `${fileCount} file${fileCount === 1 ? "" : "s"} in project` : "Project is empty"}
          </p>
        </div>
      </div>

      <ParameterModal
        open={!!paramModal}
        title="Missing parameters"
        description="Fill in the required details to continue."
        params={paramModal?.params ?? []}
        onClose={() => setParamModal(null)}
        onSubmit={(values) => {
          if (!paramModal) return;
          let msg = paramModal.message;
          if (values.projectName) msg = msg.replace("[project-name]", values.projectName);
          if (values.details) msg = values.details;
          setParamModal(null);
          setInput("");
          void sendMessage(msg);
        }}
      />
    </>
  );
}

function MessageBubble({ message }: { message: LocalMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "")}>
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-white/10" : "bg-gradient-brand neon-border",
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Sparkles className="size-3.5" />}
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-2", isUser ? "items-end" : "items-start")}>
        {message.content && (
          <div
            className={cn(
              "max-w-full whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
              isUser ? "bg-white/10 text-foreground" : "text-foreground border border-glass-border/40",
            )}
          >
            {message.content}
          </div>
        )}
        {!isUser && message.toolEvents?.map((evt, i) => (
          <ActionStatusCard key={`${evt.path}-${i}`} event={evt} />
        ))}
      </div>
    </div>
  );
}
