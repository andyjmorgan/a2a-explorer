import type { Message, Part } from "@/types/a2a";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "ROLE_USER";

  if (isUser) {
    return (
      <div className="flex justify-end px-2 sm:px-6 py-1.5">
        <div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/10">
          {message.parts.map((part, i) => (
            <PartRenderer key={i} part={part} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-6 py-1.5">
      <div className="text-sm text-foreground space-y-1">
        {message.parts.map((part, i) => (
          <PartRenderer key={i} part={part} />
        ))}
      </div>
    </div>
  );
}

function PartRenderer({ part }: { part: Part }) {
  if (part.text != null) {
    return <p className="whitespace-pre-wrap break-words">{part.text}</p>;
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
