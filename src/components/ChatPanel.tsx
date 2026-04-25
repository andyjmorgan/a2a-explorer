import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageBubble } from "./MessageBubble";
import { ArtifactView } from "./ArtifactView";
import { a2aApi, ApiError } from "@/lib/api";
import type { Message, Artifact, TaskState } from "@/types/a2a";

interface ChatPanelProps {
  agentId: string;
}

type Entry =
  | { kind: "message"; message: Message }
  | { kind: "artifact"; artifact: Artifact };

export function ChatPanel({ agentId }: ChatPanelProps) {
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

    const userMessage: Message = {
      messageId: crypto.randomUUID(),
      role: "ROLE_USER",
      parts: [{ kind: "text", text }],
      ...(contextId ? { contextId } : {}),
      ...(taskId ? { taskId } : {}),
    };
    setEntries((prev) => [...prev, { kind: "message", message: userMessage }]);
    setInput("");
    setSending(true);
    setError(null);
    setTaskState(null);

    try {
      const response = await a2aApi.sendMessage(agentId, {
        message: userMessage,
        configuration: { blocking: true },
      });

      if (response.task) {
        setContextId(response.task.contextId);
        setTaskId(response.task.id);
        setTaskState(response.task.status.state);
        if (response.task.status.message) {
          appendMessage(response.task.status.message);
        }
        for (const artifact of response.task.artifacts ?? []) {
          upsertArtifact(artifact);
        }
      } else if (response.message) {
        appendMessage(response.message);
      }
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSending(false);
    }
  }, [agentId, contextId, input, sending, taskId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  function appendMessage(message: Message) {
    setEntries((prev) => {
      if (prev.some((e) => e.kind === "message" && e.message.messageId === message.messageId)) {
        return prev;
      }
      return [...prev, { kind: "message", message }];
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
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0 px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {entries.length === 0 && !sending && (
            <div className="text-center text-xs text-muted-foreground py-16">
              Say hi to your agent.
            </div>
          )}
          {entries.map((entry, i) =>
            entry.kind === "message" ? (
              <MessageBubble key={`m-${i}`} message={entry.message} />
            ) : (
              <ArtifactView key={`a-${entry.artifact.artifactId}`} artifact={entry.artifact} />
            )
          )}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              agent is thinking…
            </div>
          )}
        </div>
      </ScrollArea>

      {error && (
        <div className="mx-4 mb-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <div className="border-t border-border/50 p-3 shrink-0">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="resize-none max-h-32"
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={sending || !input.trim()} size="icon" aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {taskState && (
          <div className="max-w-3xl mx-auto mt-2 flex justify-end">
            <Badge variant="outline" className="text-[10px]">{taskState}</Badge>
          </div>
        )}
      </div>
    </div>
  );
}

function messageFromError(err: unknown): string {
  if (err instanceof ApiError) return `${err.status}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}
