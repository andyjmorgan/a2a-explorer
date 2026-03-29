import { Zap, Shield, Tag, Workflow } from "lucide-react";
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

      <div className="flex flex-wrap items-center gap-2">
        {card.capabilities?.streaming && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Zap className="h-2.5 w-2.5" />
            Streaming
          </Badge>
        )}
        {card.capabilities?.pushNotifications && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Zap className="h-2.5 w-2.5" />
            Push
          </Badge>
        )}
        {!card.securitySchemes || Object.keys(card.securitySchemes).length === 0 ? (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Shield className="h-2.5 w-2.5" />
            No auth
          </Badge>
        ) : (
          Object.keys(card.securitySchemes).map((name) => (
            <Badge key={name} variant="secondary" className="text-[10px] gap-1">
              <Shield className="h-2.5 w-2.5" />
              {name}
            </Badge>
          ))
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
            <div className="flex flex-wrap gap-2">
              {card.skills.map((skill) => (
                <div key={skill.id} className="text-xs space-y-0.5">
                  <span className="font-medium text-foreground">{skill.name}</span>
                  {skill.tags && skill.tags.length > 0 && (
                    <div className="flex gap-1">
                      {skill.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0">
                          <Tag className="h-2 w-2 mr-0.5" />
                          {tag}
                        </Badge>
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
