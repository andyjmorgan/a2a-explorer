import { Bot } from "lucide-react";
import type { AgentCard } from "@/types/a2a";

interface AgentCardPreviewProps {
  card: AgentCard;
  baseUrl: string;
}

export function AgentCardPreview({ card, baseUrl }: AgentCardPreviewProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{card.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
              v{card.version}
            </span>
            {card.capabilities?.streaming && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                streaming
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
          <div className="text-[10px] text-muted-foreground mt-1 truncate">{baseUrl}</div>
        </div>
      </div>
      {card.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2 border-t border-border/40">
          {card.skills.map((skill) => (
            <span
              key={skill.id}
              className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground"
              title={skill.description}
            >
              {skill.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
