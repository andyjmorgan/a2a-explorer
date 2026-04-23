import { Bot, User } from "lucide-react";
import type { Message, Part } from "@/types/a2a";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center ${
          isUser
            ? "bg-secondary text-foreground"
            : "bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={`rounded-2xl px-3.5 py-2 max-w-[75%] text-sm ${
          isUser ? "bg-secondary" : "bg-card border border-border/50"
        }`}
      >
        {message.parts.map((part, i) => (
          <PartRenderer key={i} part={part} />
        ))}
      </div>
    </div>
  );
}

function PartRenderer({ part }: { part: Part }) {
  if (part.kind === "text") {
    return <p className="whitespace-pre-wrap break-words">{part.text}</p>;
  }
  if (part.kind === "data") {
    return (
      <pre className="text-xs overflow-x-auto rounded bg-background/50 p-2 my-1">
        {JSON.stringify(part.data, null, 2)}
      </pre>
    );
  }
  if (part.kind === "file") {
    const name = part.file.name ?? "file";
    if (part.file.uri) {
      return (
        <a href={part.file.uri} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {name}
        </a>
      );
    }
    return <span className="text-xs text-muted-foreground">[inline file: {name}]</span>;
  }
  return null;
}
