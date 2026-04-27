import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { CopyButton } from "./CopyButton";
import { RawViewerButton, type RawTurn } from "./RawViewerButton";
import type { Message, Part } from "@/types/a2a";

interface MessageBubbleProps {
  message: Message;
  raw?: RawTurn;
}

export function MessageBubble({ message, raw }: MessageBubbleProps) {
  const isUser = message.role === "ROLE_USER";
  const copyText = collectCopyText(message);

  if (isUser) {
    return (
      <div className="flex flex-col items-end px-2 sm:px-6 py-1.5">
        <div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/10">
          {message.parts.map((part, i) => (
            <PartRenderer key={i} part={part} variant="user" />
          ))}
        </div>
        <Toolbar copyText={copyText} raw={raw} />
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-6 py-1.5">
      <div className="text-sm text-foreground space-y-1">
        {message.parts.map((part, i) => (
          <PartRenderer key={i} part={part} variant="agent" />
        ))}
      </div>
      <Toolbar copyText={copyText} raw={raw} alignStart />
    </div>
  );
}

function Toolbar({
  copyText,
  raw,
  alignStart = false,
}: {
  copyText: string;
  raw?: RawTurn;
  alignStart?: boolean;
}) {
  if (!copyText && !raw) return null;
  return (
    <div className={`mt-1 flex items-center gap-0.5 ${alignStart ? "" : "justify-end"}`}>
      {copyText && <CopyButton text={copyText} />}
      {raw && <RawViewerButton raw={raw} />}
    </div>
  );
}

function PartRenderer({ part, variant }: { part: Part; variant: "user" | "agent" }) {
  if (part.text != null) {
    if (variant === "user") {
      // User input is plain text; preserve newlines, don't run markdown so user-typed punctuation
      // doesn't get interpreted as formatting.
      return <p className="whitespace-pre-wrap break-words">{part.text}</p>;
    }
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-background prose-pre:border prose-pre:border-border prose-code:text-cyan-400 prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline [&>*:last-child]:mb-0">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{part.text}</ReactMarkdown>
      </div>
    );
  }
  if (part.data != null) {
    return (
      <pre className="text-xs overflow-x-auto rounded bg-background/50 p-2 my-1">
        {JSON.stringify(part.data, null, 2)}
      </pre>
    );
  }
  if (part.url != null) {
    const name = part.filename ?? "file";
    return (
      <a href={part.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
        {name}
      </a>
    );
  }
  if (part.raw != null) {
    const name = part.filename ?? "file";
    return <span className="text-xs text-muted-foreground">[inline file: {name}]</span>;
  }
  return null;
}

function collectCopyText(message: Message): string {
  return message.parts
    .map((p) => {
      if (p.text != null) return p.text;
      if (p.data != null) return JSON.stringify(p.data, null, 2);
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}
