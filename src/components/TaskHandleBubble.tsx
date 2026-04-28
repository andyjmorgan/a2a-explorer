import { useEffect, useRef, useState } from "react";
import { RefreshCw, X, AlertCircle, CheckCircle2, XCircle, KeyRound, Timer } from "lucide-react";
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
  label: string;
  pulse: string;
  icon: string;
  iconKind: "pulse" | "check" | "cross" | "key";
}

const NEUTRAL_THEME: StateTheme = {
  container: "border-border bg-card",
  badge: "border-border/60 bg-muted text-muted-foreground",
  label: "text-muted-foreground",
  pulse: "bg-muted-foreground",
  icon: "text-muted-foreground",
  iconKind: "pulse",
};

const CYAN_THEME: StateTheme = {
  container: "border-cyan-500/40 bg-cyan-500/10 dark:bg-cyan-500/5",
  badge: "border-cyan-500/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  label: "text-cyan-700 dark:text-cyan-300",
  pulse: "bg-cyan-500 dark:bg-cyan-400",
  icon: "text-cyan-700 dark:text-cyan-300",
  iconKind: "pulse",
};

const AMBER_THEME: StateTheme = {
  container: "border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/5",
  badge: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  label: "text-amber-700 dark:text-amber-300",
  pulse: "bg-amber-500 dark:bg-amber-400",
  icon: "text-amber-700 dark:text-amber-300",
  iconKind: "key",
};

const EMERALD_THEME: StateTheme = {
  container: "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/5",
  badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  label: "text-emerald-700 dark:text-emerald-300",
  pulse: "bg-emerald-500 dark:bg-emerald-400",
  icon: "text-emerald-700 dark:text-emerald-300",
  iconKind: "check",
};

const DESTRUCTIVE_THEME: StateTheme = {
  container: "border-destructive/50 bg-destructive/10 dark:bg-destructive/5",
  badge: "border-destructive/50 bg-destructive/15 text-destructive",
  label: "text-destructive",
  pulse: "bg-destructive",
  icon: "text-destructive",
  iconKind: "cross",
};

const THEMES: Record<TaskState, StateTheme> = {
  TASK_STATE_UNSPECIFIED: NEUTRAL_THEME,
  TASK_STATE_SUBMITTED: CYAN_THEME,
  TASK_STATE_WORKING: CYAN_THEME,
  TASK_STATE_INPUT_REQUIRED: AMBER_THEME,
  TASK_STATE_AUTH_REQUIRED: AMBER_THEME,
  TASK_STATE_COMPLETED: EMERALD_THEME,
  TASK_STATE_FAILED: DESTRUCTIVE_THEME,
  TASK_STATE_CANCELED: DESTRUCTIVE_THEME,
  TASK_STATE_REJECTED: DESTRUCTIVE_THEME,
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

  const isTerminal = TERMINAL_TASK_STATES.has(status);

  useEffect(() => {
    // Once the task reaches a terminal state the "checked Xs ago" hint is no longer
    // a live signal — freeze it so the counter stops ticking forever post-completion.
    if (isTerminal) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isTerminal]);

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
          <StateIcon kind={theme.iconKind} pulseColor={theme.pulse} iconClass={theme.icon} />
          <span className="text-xs font-semibold text-foreground">Task</span>
          <Badge
            variant="outline"
            className={`text-[10px] uppercase tracking-wide font-medium ${theme.badge}`}
          >
            {stateLabel}
          </Badge>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span aria-hidden className={`h-1 w-1 rounded-full ${theme.pulse} opacity-70`} />
            checked {ageSeconds}s ago
          </span>
        </div>

        <div className="space-y-1">
          <IdRow label="task" value={taskId} labelClass={theme.label} />
          <IdRow label="ctx" value={contextId} labelClass={theme.label} />
        </div>

        {statusMessage && (
          <div className="text-xs text-foreground/80 whitespace-pre-wrap break-words rounded-md bg-background/60 dark:bg-background/40 px-2.5 py-1.5">
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
          {raw && <RawViewerButton raw={{ response: raw }} />}
          <div className="ml-auto flex items-center">
            <button
              type="button"
              onClick={() => void onRefresh()}
              disabled={busy}
              className={`inline-flex items-center gap-1 border border-border/60 bg-secondary/60 px-2 py-1 text-[11px] text-foreground/80 hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 ${
                !isTerminal ? "rounded-l-md border-r-0" : "rounded-md"
              }`}
              aria-label="Refresh task"
            >
              <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            {!isTerminal && (
              <button
                type="button"
                role="switch"
                aria-checked={auto}
                aria-label="Auto-refresh every 10 seconds"
                title={auto ? "Auto-refresh on (10s)" : "Auto-refresh off"}
                onClick={() => setAuto((v) => !v)}
                className={`inline-flex items-center justify-center rounded-r-md border px-1.5 py-1 transition-colors ${
                  auto
                    ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20"
                    : "border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Timer className={`h-3 w-3 ${auto ? "animate-pulse" : ""}`} />
              </button>
            )}
            {!isTerminal && (
              <button
                type="button"
                onClick={() => void onCancel()}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50 ml-1.5"
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

function IdRow({ label, value, labelClass }: { label: string; value: string; labelClass: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`text-[10px] uppercase tracking-wider w-10 shrink-0 font-semibold ${labelClass}`}>
        {label}
      </span>
      <span
        className="font-mono text-[11px] text-foreground truncate min-w-0"
        title={value}
      >
        {value}
      </span>
      <CopyButton text={value} />
    </div>
  );
}

function StateIcon({
  kind,
  pulseColor,
  iconClass,
}: {
  kind: StateTheme["iconKind"];
  pulseColor: string;
  iconClass: string;
}) {
  if (kind === "pulse") return <PulseDots color={pulseColor} size="w-1 h-1" />;
  if (kind === "check") return <CheckCircle2 className={`h-3.5 w-3.5 ${iconClass}`} />;
  if (kind === "cross") return <XCircle className={`h-3.5 w-3.5 ${iconClass}`} />;
  return <KeyRound className={`h-3.5 w-3.5 ${iconClass}`} />;
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
