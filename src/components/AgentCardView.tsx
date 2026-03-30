import { Zap, Shield, Tag, Workflow, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AgentCard } from "@/types/a2a";

interface AgentCardViewProps {
  card: AgentCard;
}

export function AgentCardView({ card }: AgentCardViewProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>

      <div className="flex flex-wrap items-center gap-1.5">
        {card.capabilities?.streaming && (
          <Badge variant="secondary" className="text-[10px] gap-1 border border-cyan-500/20 text-cyan-500">
            <Zap className="h-2.5 w-2.5" />
            Streaming
          </Badge>
        )}
        {card.capabilities?.pushNotifications && (
          <Badge variant="secondary" className="text-[10px] gap-1 border border-cyan-500/20 text-cyan-500">
            <Zap className="h-2.5 w-2.5" />
            Push
          </Badge>
        )}
        {!card.securitySchemes || Object.keys(card.securitySchemes).length === 0 ? (
          <Badge variant="secondary" className="text-[10px] gap-1 border border-emerald-500/20 text-emerald-500">
            <Shield className="h-2.5 w-2.5" />
            Open access
          </Badge>
        ) : (
          Object.keys(card.securitySchemes).map((name) => (
            <Badge key={name} variant="secondary" className="text-[10px] gap-1 border border-amber-500/20 text-amber-500">
              <Shield className="h-2.5 w-2.5" />
              {name}
            </Badge>
          ))
        )}
        {card.provider && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            {card.provider.organization}
            {card.provider.url && (
              <a href={card.provider.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-2 w-2" />
              </a>
            )}
          </Badge>
        )}
      </div>

      {card.skills.length > 0 && (
        <>
          <Separator className="bg-border/30" />
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <Workflow className="h-3 w-3" />
              Skills
            </div>
            <div className="flex flex-wrap gap-1.5">
              {card.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="group px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border/30 hover:border-primary/20 transition-colors"
                >
                  <span className="text-xs font-medium text-foreground">{skill.name}</span>
                  {skill.tags && skill.tags.length > 0 && (
                    <div className="flex gap-1 mt-0.5">
                      {skill.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center text-[9px] text-muted-foreground/60">
                          <Tag className="h-2 w-2 mr-0.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
