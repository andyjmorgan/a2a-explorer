import { FileText } from "lucide-react";
import type { Artifact, Part } from "@/types/a2a";

interface ArtifactViewProps {
  artifact: Artifact;
}

export function ArtifactView({ artifact }: ArtifactViewProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        <span className="font-medium">{artifact.name ?? "Artifact"}</span>
        {artifact.description && <span>· {artifact.description}</span>}
      </div>
      <div className="space-y-1">
        {artifact.parts.map((part, i) => (
          <ArtifactPart key={i} part={part} />
        ))}
      </div>
    </div>
  );
}

function ArtifactPart({ part }: { part: Part }) {
  if (part.kind === "text") {
    return <p className="whitespace-pre-wrap break-words text-sm">{part.text}</p>;
  }
  if (part.kind === "data") {
    return (
      <pre className="text-xs overflow-x-auto rounded bg-background/50 p-2">
        {JSON.stringify(part.data, null, 2)}
      </pre>
    );
  }
  if (part.kind === "file") {
    const name = part.file.name ?? "file";
    if (part.file.uri) {
      return (
        <a href={part.file.uri} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
          {name}
        </a>
      );
    }
    return <span className="text-xs text-muted-foreground">[inline file: {name}]</span>;
  }
  return null;
}
