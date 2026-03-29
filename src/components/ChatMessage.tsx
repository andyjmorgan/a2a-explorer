import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Message, Part } from "@/types/a2a";

interface ChatMessageProps {
  message: Message;
}

function PartContent({ part }: { part: Part }) {
  if (part.kind === "text") {
    return <span className="whitespace-pre-wrap break-words">{part.text}</span>;
  }
  if (part.kind === "data") {
    return (
      <pre className="text-xs font-mono bg-secondary/50 rounded-lg p-3 overflow-x-auto">
        {JSON.stringify(part.data, null, 2)}
      </pre>
    );
  }
  if (part.kind === "file") {
    return (
      <div className="text-xs text-muted-foreground italic">
        [File: {part.file.name || "unnamed"} ({part.file.mimeType || "unknown type"})]
      </div>
    );
  }
  return null;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const textContent = message.parts
    .filter((p): p is Extract<Part, { kind: "text" }> => p.kind === "text")
    .map((p) => p.text)
    .join("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] text-sm px-4 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/15">
          {message.parts.map((part, i) => (
            <PartContent key={i} part={part} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="text-sm leading-relaxed text-foreground">
        {message.parts.map((part, i) => (
          <PartContent key={i} part={part} />
        ))}
      </div>
      {textContent && (
        <button
          onClick={handleCopy}
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted/50"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      )}
    </div>
  );
}
