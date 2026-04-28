import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Bot, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { ArtifactView } from "./ArtifactView";
import { PulseDots } from "./PulseDots";
import { TaskHandleBubble } from "./TaskHandleBubble";
import { a2aApi, ApiError, type SendMessageRequestBody, type SendMessageResponseBody } from "@/lib/api";
import {
  type Message,
  type Artifact,
  type Task,
  type TaskState,
} from "@/types/a2a";
import { shadeOf } from "./AgentShade";

interface ChatPanelProps {
  agentId: string;
  iconShade?: string;
}

type Entry =
  | { kind: "message"; message: Message; raw?: { request?: SendMessageRequestBody; response?: SendMessageResponseBody } }
  | { kind: "artifact"; artifact: Artifact }
  | {
      kind: "taskHandle";
      taskId: string;
      contextId: string;
      status: TaskState;
      lastCheckedAt: number;
      raw?: Task;
      busy?: boolean;
      error?: string | null;
    };

export function ChatPanel({ agentId, iconShade }: ChatPanelProps) {
  const shade = shadeOf(iconShade);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [contextId, setContextId] = useState<string | undefined>(undefined);
  const [taskId, setTaskId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [blockingMode, setBlockingMode] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset whenever the selected agent changes.
  useEffect(() => {
    setEntries([]);
    setInput("");
    setTaskState(null);
    setContextId(undefined);
    setTaskId(undefined);
    setError(null);
    setSending(false);
  }, [agentId]);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [entries, sending]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    // Only echo the taskId back when the agent is still expecting input on that
    // same task. For every other state — including `completed` — the next user
    // turn must start a fresh task under the same contextId; reusing the id makes
    // the agent reject with "task is already completed".
    const continuingTask = taskState === "TASK_STATE_INPUT_REQUIRED" && taskId !== undefined;
    const userMessage: Message = {
      messageId: crypto.randomUUID(),
      role: "ROLE_USER",
      parts: [{ text }],
      ...(contextId ? { contextId } : {}),
      ...(continuingTask ? { taskId } : {}),
    };
    const requestBody: SendMessageRequestBody = {
      message: userMessage,
      configuration: { returnImmediately: !blockingMode },
    };
    setEntries((prev) => [
      ...prev,
      { kind: "message", message: userMessage, raw: { request: requestBody } },
    ]);
    setInput("");
    setSending(true);
    setError(null);
    setTaskState(null);

    try {
      const response = await a2aApi.sendMessage(agentId, requestBody);

      if (response.task) {
        setContextId(response.task.contextId);
        setTaskId(response.task.id);
        setTaskState(response.task.status.state);

        // Always surface the task handle so the user can see/copy taskId + ctxId,
        // refresh, and (when non-terminal) cancel. On terminal+completed, also append
        // the result message and any artifacts after the handle.
        appendTaskHandle(response.task);
        if (response.task.status.state === "TASK_STATE_COMPLETED") {
          const resultMessage =
            response.task.status.message ?? lastAgentMessage(response.task.history);
          if (resultMessage) {
            appendMessage(resultMessage, response);
          }
          const resultText = resultMessage ? plainText(resultMessage.parts) : null;
          for (const artifact of response.task.artifacts ?? []) {
            if (resultText !== null && artifactIsTextOnly(artifact) && plainText(artifact.parts) === resultText) {
              continue;
            }
            upsertArtifact(artifact);
          }
        }
      } else if (response.message) {
        // A bare message response still carries the conversation's contextId — capture it so
        // follow-ups include it and the agent recognises the same turn.
        if (response.message.contextId) setContextId(response.message.contextId);
        if (response.message.taskId) setTaskId(response.message.taskId);
        appendMessage(response.message, response);
      }
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSending(false);
    }
  }, [agentId, blockingMode, contextId, input, sending, taskId, taskState]);

  function appendTaskHandle(task: Task) {
    setEntries((prev) => {
      const idx = prev.findIndex(
        (e) => e.kind === "taskHandle" && e.taskId === task.id
      );
      const handle: Entry = {
        kind: "taskHandle",
        taskId: task.id,
        contextId: task.contextId,
        status: task.status.state,
        lastCheckedAt: Date.now(),
        raw: task,
      };
      if (idx === -1) return [...prev, handle];
      const copy = [...prev];
      copy[idx] = handle;
      return copy;
    });
  }

  function applyTaskUpdate(taskHandleId: string, task: Task) {
    setEntries((prev) => {
      const idx = prev.findIndex(
        (e) => e.kind === "taskHandle" && e.taskId === taskHandleId
      );
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = {
        kind: "taskHandle",
        taskId: task.id,
        contextId: task.contextId,
        status: task.status.state,
        lastCheckedAt: Date.now(),
        raw: task,
      };
      if (task.status.state === "TASK_STATE_COMPLETED") {
        const inserts: Entry[] = [];
        const resultMessage = task.status.message ?? lastAgentMessage(task.history);
        const existingMessageIds = new Set(
          copy.filter((e) => e.kind === "message").map((e) => e.message.messageId)
        );
        if (resultMessage && !existingMessageIds.has(resultMessage.messageId)) {
          inserts.push({ kind: "message", message: resultMessage, raw: { response: { task } } });
        }
        const resultText = resultMessage ? plainText(resultMessage.parts) : null;
        const existingArtifactIds = new Set(
          copy.filter((e) => e.kind === "artifact").map((e) => e.artifact.artifactId)
        );
        for (const artifact of task.artifacts ?? []) {
          if (existingArtifactIds.has(artifact.artifactId)) continue;
          // Agentlings often duplicate the final message into a text-only artifact; skip those
          // to avoid rendering the same content twice. Non-text artifacts (files, code) still go through.
          if (resultText !== null && artifactIsTextOnly(artifact) && plainText(artifact.parts) === resultText) {
            continue;
          }
          inserts.push({ kind: "artifact", artifact });
        }
        if (inserts.length > 0) {
          copy.splice(idx + 1, 0, ...inserts);
        }
      }
      return copy;
    });
    setTaskState(task.status.state);
  }

  function setHandleBusy(taskHandleId: string, busy: boolean, errorText: string | null = null) {
    setEntries((prev) =>
      prev.map((e) =>
        e.kind === "taskHandle" && e.taskId === taskHandleId
          ? { ...e, busy, error: errorText }
          : e
      )
    );
  }

  const refreshTask = useCallback(
    async (taskHandleId: string) => {
      setHandleBusy(taskHandleId, true, null);
      try {
        const task = await a2aApi.getTask(agentId, taskHandleId);
        applyTaskUpdate(taskHandleId, task);
      } catch (err) {
        setHandleBusy(taskHandleId, false, messageFromError(err));
      }
    },
    [agentId]
  );

  const cancelTaskHandle = useCallback(
    async (taskHandleId: string) => {
      setHandleBusy(taskHandleId, true, null);
      try {
        const task = await a2aApi.cancelTask(agentId, taskHandleId);
        applyTaskUpdate(taskHandleId, task);
      } catch (err) {
        setHandleBusy(taskHandleId, false, messageFromError(err));
      }
    },
    [agentId]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  function appendMessage(message: Message, response?: SendMessageResponseBody) {
    setEntries((prev) => {
      if (prev.some((e) => e.kind === "message" && e.message.messageId === message.messageId)) {
        return prev;
      }
      return [...prev, { kind: "message", message, raw: response ? { response } : undefined }];
    });
  }

  function upsertArtifact(artifact: Artifact) {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.kind === "artifact" && e.artifact.artifactId === artifact.artifactId);
      if (idx === -1) return [...prev, { kind: "artifact", artifact }];
      const copy = [...prev];
      copy[idx] = { kind: "artifact", artifact };
      return copy;
    });
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
        <div className="max-w-3xl mx-auto py-4 sm:py-6">
          {entries.length === 0 && !sending && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-6 text-center">
              <div className={`flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${shade.gradient} mb-5`}>
                <Bot className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <p className="text-base font-medium text-foreground mb-1">Say hi to your agent</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Send a message and watch what comes back. Streaming is post-MVP — every reply is the
                full task envelope.
              </p>
            </div>
          )}
          {entries.map((entry, i) => {
            if (entry.kind === "message") {
              return <MessageBubble key={`m-${i}`} message={entry.message} raw={entry.raw} />;
            }
            if (entry.kind === "artifact") {
              return (
                <div key={`a-${entry.artifact.artifactId}`} className="px-2 sm:px-6 py-1.5">
                  <ArtifactView artifact={entry.artifact} />
                </div>
              );
            }
            return (
              <TaskHandleBubble
                key={`t-${entry.taskId}`}
                taskId={entry.taskId}
                contextId={entry.contextId}
                status={entry.status}
                lastCheckedAt={entry.lastCheckedAt}
                raw={entry.raw}
                busy={entry.busy}
                error={entry.error ?? null}
                onRefresh={() => refreshTask(entry.taskId)}
                onCancel={() => cancelTaskHandle(entry.taskId)}
              />
            );
          })}
          {sending && (
            <div className="flex justify-start px-2 sm:px-6 py-2">
              <div className="flex items-center px-3 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                <PulseDots color="bg-cyan-400" size="w-1.5 h-1.5" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex-none">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {error && (
          <div className="mx-3 sm:mx-6 mt-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div className="break-words">{error}</div>
          </div>
        )}

        <div className="px-3 sm:px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={sending ? "Send another message…" : "Send a message…"}
                rows={1}
                className="min-h-11 h-11 max-h-32 resize-none rounded-xl bg-secondary px-4 py-2.5 text-sm border-input focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20"
                disabled={sending}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              size="icon"
              aria-label="Send"
              className="h-11 w-11 rounded-xl text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/25 disabled:opacity-40 disabled:hover:shadow-none transition-all"
            >
              {sending ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="max-w-3xl mx-auto mt-2 flex items-center gap-1.5">
            <button
              type="button"
              role="switch"
              aria-checked={!blockingMode}
              onClick={() => setBlockingMode((v) => !v)}
              disabled={sending}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                !blockingMode
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/15"
                  : "border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  !blockingMode ? "bg-cyan-400" : "bg-muted-foreground/40"
                }`}
              />
              <span>Run as task</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function lastAgentMessage(history: Message[] | undefined): Message | undefined {
  if (!history) return undefined;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "ROLE_AGENT") return history[i];
  }
  return undefined;
}

function plainText(parts: { text?: string | null }[]): string {
  return parts
    .map((p) => (p.text != null ? p.text : ""))
    .join("");
}

function artifactIsTextOnly(artifact: Artifact): boolean {
  return artifact.parts.length > 0 && artifact.parts.every((p) => p.text != null);
}

function messageFromError(err: unknown): string {
  if (err instanceof ApiError) return `${err.status}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}

