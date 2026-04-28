import { useEffect, useRef, useState } from "react";
import { RefreshCw, X, AlertCircle, CheckCircle2, XCircle, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "./CopyButton";
import { PulseDots } from "./PulseDots";
import { RawViewerButton } from "./RawViewerButton";
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

const AUTO_REFRESH_MS = 10_000;

interface StateTheme {
  container: string;
  badge: string;
  badgeText: string;
  pulse: string;
  iconKind: "pulse" | "check" | "cross" | "key";
}

const THEMES: Record<TaskState, StateTheme> = {
  TASK_STATE_UNSPECIFIED: {
    container: "border-border/50 bg-card/60",
    badge: "bg-muted text-muted-foreground border-border/60",
    badgeText: "text-muted-foreground",
    pulse: "bg-muted-foreground",
    iconKind: "pulse",
  },
  TASK_STATE_SUBMITTED: {
    container: "border-cyan-500/30 bg-cyan-500/5",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
    badgeText: "text-cyan-300",
    pulse: "bg-cyan-400",
    iconKind: "pulse",
  },
  TASK_STATE_WORKING: {
    container: "border-cyan-500/30 bg-cyan-500/5",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
    badgeText: "text-cyan-300",
    pulse: "bg-cyan-400",
    iconKind: "pulse",
  },
  TASK_STATE_INPUT_REQUIRED: {
    container: "border-amber-500/30 bg-amber-500/5",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    badgeText: "text-amber-300",
    pulse: "bg-amber-400",
    iconKind: "key",
  },
  TASK_STATE_AUTH_REQUIRED: {
    container: "border-amber-500/30 bg-amber-500/5",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    badgeText: "text-amber-300",
    pulse: "bg-amber-400",
    iconKind: "key",
  },
  TASK_STATE_COMPLETED: {
    container: "border-emerald-500/30 bg-emerald-500/5",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    badgeText: "text-emerald-300",
    pulse: "bg-emerald-400",
    iconKind: "check",
  },
  TASK_STATE_FAILED: {
    container: "border-destructive/40 bg-destructive/5",
    badge: "bg-destructive/15 text-destructive border-destructive/40",
    badgeText: "text-destructive",
    pulse: "bg-destructive",
    iconKind: "cross",
  },
  TASK_STATE_CANCELED: {
    container: "border-destructive/40 bg-destructive/5",
    badge: "bg-destructive/15 text-destructive border-destructive/40",
    badgeText: "text-destructive",
    pulse: "bg-destructive",
    iconKind: "cross",
  },
  TASK_STATE_REJECTED: {
    container: "border-destructive/40 bg-destructive/5",
    badge: "bg-destructive/15 text-destructive border-destructive/40",
    badgeText: "text-destructive",
    pulse: "bg-destructive",
    iconKind: "cross",
  },
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
  const [auto, setAuto] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  const busyRef = useRef(!!busy);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    busyRef.current = !!busy;
  }, [busy]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const isTerminal = TERMINAL_TASK_STATES.has(status);

  useEffect(() => {
    if (!auto || isTerminal) return;
    const id = window.setInterval(() => {
      if (!busyRef.current) void onRefreshRef.current();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [auto, isTerminal]);

  const ageSeconds = Math.max(0, Math.round((now - lastCheckedAt) / 1000));
  // On TASK_STATE_COMPLETED the parent appends the result as its own message bubble, so don't
  // duplicate it inside the handle. For other states (working, failed, canceled, …) the
  // status message is in-flight progress / failure reason and belongs on the handle.
  const showStatusMessage = status !== "TASK_STATE_COMPLETED";
  const statusMessage = showStatusMessage ? collectStatusMessageText(raw?.status?.message) : "";
  const theme = THEMES[status];
  const stateLabel = friendlyTaskState(status);

  return (
    <div className="px-2 sm:px-6 py-1.5">
      <div className={`rounded-xl border p-3 space-y-2.5 transition-colors ${theme.container}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <StateIcon kind={theme.iconKind} pulseColor={theme.pulse} />
          <span className="text-xs font-semibold text-foreground">Task</span>
          <Badge
            variant="outline"
            className={`text-[10px] uppercase tracking-wide font-medium ${theme.badge}`}
          >
            {stateLabel}
          </Badge>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
            <span aria-hidden className={`h-1 w-1 rounded-full ${theme.pulse} opacity-70`} />
            checked {ageSeconds}s ago
          </span>
        </div>

        <div className="space-y-1">
          <IdRow label="task" value={taskId} accent={theme.badgeText} />
          <IdRow label="ctx" value={contextId} accent={theme.badgeText} />
        </div>

        {statusMessage && (
          <div className="text-xs text-foreground/80 whitespace-pre-wrap break-words rounded-md bg-background/40 px-2.5 py-1.5">
            {statusMessage}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-1.5 text-[11px] text-destructive">
            <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
            <span className="break-words">{error}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {!isTerminal && (
            <button
              type="button"
              role="switch"
              aria-checked={auto}
              aria-label="Auto-refresh every 10 seconds"
              onClick={() => setAuto((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors ${
                auto
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/15"
                  : "border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  auto ? "bg-cyan-400 animate-pulse" : "bg-muted-foreground/40"
                }`}
              />
              <span>Auto 10s</span>
            </button>
          )}
          {raw && <RawViewerButton raw={{ response: raw }} />}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/60 px-2 py-1 text-[11px] text-foreground/80 hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
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
    </div>
  );
}

function IdRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`text-[10px] uppercase tracking-wider w-9 shrink-0 ${accent}`}>{label}</span>
      <span
        className="flex-1 min-w-0 font-mono text-[11px] text-foreground/85 truncate"
        title={value}
      >
        {value}
      </span>
      <CopyButton text={value} />
    </div>
  );
}

function StateIcon({ kind, pulseColor }: { kind: StateTheme["iconKind"]; pulseColor: string }) {
  if (kind === "pulse") return <PulseDots color={pulseColor} size="w-1 h-1" />;
  if (kind === "check") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  if (kind === "cross") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  return <KeyRound className="h-3.5 w-3.5 text-amber-400" />;
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
