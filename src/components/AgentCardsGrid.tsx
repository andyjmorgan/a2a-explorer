import { useEffect, useState } from "react";
import { Bot, Lock, MoreHorizontal, Pencil, Plus, Trash2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { a2aApi } from "@/lib/api";
import type { AgentCard as AgentCardData } from "@/types/a2a";
import type { AgentSummary } from "@/types/saved-agent";
import { shadeOf } from "./AgentShade";

interface AgentCardsGridProps {
  agents: AgentSummary[];
  onSelect: (id: string) => void;
  onNewAgent: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AgentCardsGrid({ agents, onSelect, onNewAgent, onEdit, onDelete }: AgentCardsGridProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <header className="mb-6 sm:mb-8 flex items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Your agents</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Pick one to chat with, or add another.
            </p>
          </div>
          <div className="flex-1" />
          <Button
            onClick={onNewAgent}
            className="h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/25 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New agent
          </Button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onSelect={() => onSelect(agent.id)}
              onEdit={() => onEdit(agent.id)}
              onDelete={() => onDelete(agent.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentCard({
  agent,
  onSelect,
  onEdit,
  onDelete,
}: {
  agent: AgentSummary;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const gated = agent.authMode === "Header";
  const shade = shadeOf(agent.iconShade);
  const [card, setCard] = useState<AgentCardData | null>(null);

  // Lazily resolve each agent's card so we can surface skill tags on the grid.
  // Failures are silent — the card just won't show tags.
  useEffect(() => {
    let cancelled = false;
    a2aApi.getCard(agent.id).then(
      (c) => { if (!cancelled) setCard(c); },
      () => { /* ignore */ },
    );
    return () => { cancelled = true; };
  }, [agent.id]);

  const tags = collectTags(card);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="group relative text-left rounded-2xl border border-border/50 bg-card/60 p-4 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
    >
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${shade.gradient} flex items-center justify-center shrink-0`}>
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold truncate">{agent.name}</h3>
            {gated ? (
              <Lock className="h-3 w-3 text-amber-500/80 shrink-0" aria-label="Header auth" />
            ) : (
              <Unlock className="h-3 w-3 text-emerald-500/80 shrink-0" aria-label="No auth" />
            )}
          </div>
          {card?.description && (
            <p className="text-xs text-muted-foreground/90 mt-1 line-clamp-2">{card.description}</p>
          )}
          <div className="text-[10px] text-muted-foreground truncate mt-1">{agent.baseUrl}</div>
          <div className="text-[10px] text-muted-foreground/70 mt-1">
            {agent.lastUsedAt ? `Last used ${formatRelative(agent.lastUsedAt)}` : "Never used"}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props) => (
              <button
                {...props}
                onClick={(e) => e.stopPropagation()}
                className="md:opacity-0 md:group-hover:opacity-100 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-opacity"
                aria-label="Agent actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border/40">
          {tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {tags.length > 6 && (
            <span className="text-[10px] px-2 py-0.5 text-muted-foreground/70">
              +{tags.length - 6}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function collectTags(card: AgentCardData | null): string[] {
  if (!card) return [];
  const seen = new Set<string>();
  for (const skill of card.skills ?? []) {
    for (const tag of skill.tags ?? []) seen.add(tag);
  }
  // Fall back to skill names if no tags were declared at all.
  if (seen.size === 0) {
    for (const skill of card.skills ?? []) seen.add(skill.name);
  }
  return Array.from(seen);
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "recently";
  const diffMs = Date.now() - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
