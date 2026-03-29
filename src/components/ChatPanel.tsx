import { useState, useRef, useEffect, useCallback } from "react";
import { Send, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "./ChatMessage";
import { PulseDots } from "./PulseDots";
import type { A2AClient } from "@/lib/a2a-client";
import type { AgentCard, Message, TaskState } from "@/types/a2a";

interface ChatPanelProps {
  client: A2AClient;
  card: AgentCard;
}

interface ChatEntry {
  type: "message";
  message: Message;
}

export function ChatPanel({ client, card }: ChatPanelProps) {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [contextId, setContextId] = useState<string | undefined>(undefined);
  const [taskId, setTaskId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [entries, sending, scrollToBottom]);

  const supportsStreaming = card.capabilities?.streaming === true;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMessage: Message = {
      messageId: crypto.randomUUID(),
      role: "user",
      parts: [{ kind: "text", text }],
    };

    setEntries((prev) => [...prev, { type: "message", message: userMessage }]);
    setInput("");
    setSending(true);
    setError(null);
    setTaskState(null);

    try {
      if (supportsStreaming) {
        let agentText = "";
        let currentTaskId = taskId;
        let currentContextId = contextId;

        for await (const event of client.sendStreamingMessage(text, contextId, taskId)) {
          if (event.type === "task") {
            currentTaskId = event.task.id;
            currentContextId = event.task.contextId;
            setTaskState(event.task.status.state);

            if (event.task.status.message) {
              setEntries((prev) => [
                ...prev.filter((e) => e.message.messageId !== "streaming-agent-response"),
                { type: "message", message: event.task.status.message! },
              ]);
              agentText = "";
            }
          } else if (event.type === "message") {
            setEntries((prev) => [
              ...prev.filter((e) => e.message.messageId !== "streaming-agent-response"),
              { type: "message", message: event.message },
            ]);
            if (event.message.contextId) currentContextId = event.message.contextId;
          } else if (event.type === "statusUpdate") {
            setTaskState(event.statusUpdate.status.state);
            if (event.statusUpdate.status.message) {
              setEntries((prev) => [
                ...prev.filter((e) => e.message.messageId !== "streaming-agent-response"),
                { type: "message", message: event.statusUpdate.status.message! },
              ]);
            }
          } else if (event.type === "artifactUpdate") {
            const parts = event.artifactUpdate.artifact.parts;
            const newText = parts
              .filter((p) => p.kind === "text")
              .map((p) => (p as { kind: "text"; text: string }).text)
              .join("");

            if (event.artifactUpdate.append) {
              agentText += newText;
            } else {
              agentText = newText;
            }

            const streamMsg: Message = {
              messageId: "streaming-agent-response",
              role: "agent",
              parts: [{ kind: "text", text: agentText }],
            };

            setEntries((prev) => {
              const withoutStream = prev.filter((e) => e.message.messageId !== "streaming-agent-response");
              return [...withoutStream, { type: "message", message: streamMsg }];
            });
          }
        }

        setTaskId(currentTaskId);
        setContextId(currentContextId);
      } else {
        const result = await client.sendMessage(text, contextId, taskId);

        if (result.task) {
          setTaskId(result.task.id);
          setContextId(result.task.contextId);
          setTaskState(result.task.status.state);

          if (result.task.status.message) {
            setEntries((prev) => [...prev, { type: "message", message: result.task!.status.message! }]);
          }

          if (result.task.artifacts) {
            for (const artifact of result.task.artifacts) {
              const agentMsg: Message = {
                messageId: crypto.randomUUID(),
                role: "agent",
                parts: artifact.parts,
              };
              setEntries((prev) => [...prev, { type: "message", message: agentMsg }]);
            }
          }

          if (result.task.history) {
            const agentMessages = result.task.history.filter((m) => m.role === "agent");
            if (agentMessages.length > 0) {
              const latestAgent = agentMessages[agentMessages.length - 1];
              setEntries((prev) => [...prev, { type: "message", message: latestAgent }]);
            }
          }
        } else if (result.message) {
          setEntries((prev) => [...prev, { type: "message", message: result.message! }]);
          if (result.message.contextId) setContextId(result.message.contextId);
          if (result.message.taskId) setTaskId(result.message.taskId);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setEntries([]);
    setContextId(undefined);
    setTaskId(undefined);
    setTaskState(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between px-6 py-2 shrink-0">
        <div className="flex items-center gap-2">
          {taskState && (
            <Badge
              variant="outline"
              className={`text-[10px] ${
                taskState === "completed"
                  ? "border-emerald-500/30 text-emerald-500"
                  : taskState === "working"
                    ? "border-primary/30 text-primary"
                    : taskState === "failed"
                      ? "border-destructive/30 text-destructive"
                      : taskState === "input-required"
                        ? "border-amber-500/30 text-amber-500"
                        : ""
              }`}
            >
              {taskState}
            </Badge>
          )}
        </div>
        {entries.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 px-6">
        <div className="py-6 space-y-6">
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Send a message to start chatting with{" "}
                <span className="font-medium text-foreground">{card.name}</span>
              </p>
              {card.skills.length > 0 && card.skills[0].examples && (
                <div className="mt-4 space-y-2">
                  {card.skills[0].examples.slice(0, 3).map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(ex)}
                      className="block text-xs text-primary/80 hover:text-primary px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {entries.map((entry, i) => (
            <ChatMessage key={i} message={entry.message} />
          ))}

          {sending && (
            <div className="text-primary/60">
              <PulseDots />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 px-6 shrink-0">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={sending}
            className="min-h-[44px] max-h-[120px] rounded-xl bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20 resize-none text-sm"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            size="icon"
            className="h-[44px] w-[44px] rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
