import { useEffect, useState } from "react";
import { RefreshCw, X, Hourglass, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "./CopyButton";
import {
  TERMINAL_TASK_STATES,
  friendlyTaskState,
  type Message,
  type Task,
  type TaskState,
} from "@/types/a2a";

interface TaskHandleBubbleProps {
  taskId: string;
  contextId: string;
  status: TaskState;
  lastCheckedAt: number;
  raw?: Task;
  onRefresh: () => Promise<void> | void;
  onCancel: () => Promise<void> | void;
  busy?: boolean;
  error?: string | null;
}

const STATE_VARIANT: Record<TaskState, "default" | "secondary" | "destructive" | "outline" | "ghost"> = {
  TASK_STATE_UNSPECIFIED: "outline",
  TASK_STATE_SUBMITTED: "outline",
  TASK_STATE_WORKING: "secondary",
  TASK_STATE_COMPLETED: "default",
  TASK_STATE_INPUT_REQUIRED: "outline",
  TASK_STATE_AUTH_REQUIRED: "outline",
  TASK_STATE_FAILED: "destructive",
  TASK_STATE_CANCELED: "destructive",
  TASK_STATE_REJECTED: "destructive",
};

export function TaskHandleBubble({
  taskId,
  contextId,
  status,
  lastCheckedAt,
  raw,
  onRefresh,
  onCancel,
  busy,
  error,
}: TaskHandleBubbleProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const isTerminal = TERMINAL_TASK_STATES.has(status);
  const ageSeconds = Math.max(0, Math.round((now - lastCheckedAt) / 1000));
  const shortTask = taskId.length > 8 ? `${taskId.slice(0, 8)}…` : taskId;
  const shortCtx = contextId.length > 8 ? `${contextId.slice(0, 8)}…` : contextId;
  const statusMessage = collectStatusMessageText(raw?.status?.message);

  return (
    <div className="px-2 sm:px-6 py-1.5">
      <div className="rounded-xl border border-border/50 bg-card/60 p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Hourglass className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Task</span>
          <Badge variant={STATE_VARIANT[status]} className="text-[10px]">
            {friendlyTaskState(status)}
          </Badge>
          <span className="text-[10px] font-mono text-muted-foreground" title={taskId}>
            {shortTask}
          </span>
          <CopyButton text={taskId} />
          <span className="text-[10px] font-mono text-muted-foreground/70" title={`context ${contextId}`}>
            ctx {shortCtx}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground/70">
            checked {ageSeconds}s ago
          </span>
        </div>

        {statusMessage && (
          <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
            {statusMessage}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-1.5 text-[11px] text-destructive">
            <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
            <span className="break-words">{error}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/60 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            aria-label="Refresh task"
          >
            <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          {!isTerminal && (
            <button
              type="button"
              onClick={() => void onCancel()}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
              aria-label="Cancel task"
            >
              <X className="h-3 w-3" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function collectStatusMessageText(message?: Message): string {
  if (!message) return "";
  return message.parts
    .map((p) => {
      if (p.text != null) return p.text;
      if (p.data != null) return JSON.stringify(p.data);
      return "";
    })
    .filter(Boolean)
    .join("\n");
}
