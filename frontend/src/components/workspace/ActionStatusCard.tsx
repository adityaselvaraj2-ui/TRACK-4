import { FileCode2, Loader2, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolEvent } from "@/lib/api";

export function ActionStatusCard({ event }: { event: ToolEvent }) {
  const icon =
    event.type === "write_file" ? (
      <FileCode2 className="size-3.5 text-cyan shrink-0" />
    ) : event.type === "update_file" ? (
      <Pencil className="size-3.5 text-magenta shrink-0" />
    ) : (
      <Trash2 className="size-3.5 text-destructive shrink-0" />
    );

  const label =
    event.type === "write_file"
      ? `Writing ${event.path}`
      : event.type === "update_file"
        ? `Updating ${event.path}`
        : `Deleting ${event.path}`;

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs neon-border",
        event.status === "pending" && "border-cyan/30 bg-cyan/5",
        event.status === "success" && "border-cyan/50 bg-cyan/10",
        event.status === "error" && "border-destructive/50 bg-destructive/10",
      )}
    >
      {event.status === "pending" ? (
        <Loader2 className="size-3.5 animate-spin text-cyan shrink-0" />
      ) : (
        icon
      )}
      <span className="truncate font-mono text-muted-foreground">{label}</span>
      {event.status === "success" && (
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-cyan">Done</span>
      )}
      {event.status === "error" && (
        <span className="shrink-0 text-[10px] text-destructive">{event.message}</span>
      )}
    </div>
  );
}
