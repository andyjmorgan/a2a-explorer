import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Bot, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageBubble } from "./MessageBubble";
import { ArtifactView } from "./ArtifactView";
import { PulseDots } from "./PulseDots";
import { a2aApi, ApiError, type SendMessageRequestBody, type SendMessageResponseBody } from "@/lib/api";
import type { Message, Artifact, TaskState } from "@/types/a2a";
import { shadeOf } from "./AgentShade";

interface ChatPanelProps {
  agentId: string;
  iconShade?: string;
}

type Entry =
  | { kind: "message"; message: Message; raw?: { request?: SendMessageRequestBody; response?: SendMessageResponseBody } }
  | { kind: "artifact"; artifact: Artifact };

export function ChatPanel({ agentId, iconShade }: ChatPanelProps) {
  const shade = shadeOf(iconShade);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [contextId, setContextId] = useState<string | undefined>(undefined);
  const [taskId, setTaskId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
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
    const continuingTask = taskState === "input-required" && taskId !== undefined;
    const userMessage: Message = {
      messageId: crypto.randomUUID(),
      role: "ROLE_USER",
      parts: [{ text }],
      ...(contextId ? { contextId } : {}),
      ...(continuingTask ? { taskId } : {}),
    };
    const requestBody: SendMessageRequestBody = {
      message: userMessage,
      configuration: { blocking: true },
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
        if (response.task.status.message) {
          appendMessage(response.task.status.message, response);
        }
        for (const artifact of response.task.artifacts ?? []) {
          upsertArtifact(artifact);
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
  }, [agentId, contextId, input, sending, taskId, taskState]);

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
          {entries.map((entry, i) =>
            entry.kind === "message" ? (
              <MessageBubble key={`m-${i}`} message={entry.message} raw={entry.raw} />
            ) : (
              <div key={`a-${entry.artifact.artifactId}`} className="px-2 sm:px-6 py-1.5">
                <ArtifactView artifact={entry.artifact} />
              </div>
            )
          )}
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
          {(taskState || contextId || taskId) && (
            <div className="max-w-3xl mx-auto mt-2 flex flex-wrap items-center justify-end gap-1.5">
              {contextId && <IdChip label="ctx" value={contextId} />}
              {taskId && <IdChip label="task" value={taskId} />}
              {taskState && <Badge variant="outline" className="text-[10px]">{taskState}</Badge>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function messageFromError(err: unknown): string {
  if (err instanceof ApiError) return `${err.status}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}

function IdChip({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const short = value.length > 8 ? `${value.slice(0, 8)}…` : value;
  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      title={`${label}: ${value} (click to copy)`}
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/60 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      <span className="text-muted-foreground/70">{label}</span>
      <span>{copied ? "copied" : short}</span>
    </button>
  );
}
