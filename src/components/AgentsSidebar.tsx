import { Bot, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu } from "./UserMenu";
import type { AgentSummary } from "@/types/saved-agent";

interface AgentsSidebarProps {
  agents: AgentSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewAgent: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AgentsSidebar({
  agents,
  selectedId,
  onSelect,
  onNewAgent,
  onEdit,
  onDelete,
}: AgentsSidebarProps) {
  return (
    <aside className="w-64 shrink-0 border-r border-border/50 bg-card/40 flex flex-col h-screen">
      <header className="h-12 px-3 flex items-center justify-between border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">Agents</span>
        </div>
        <UserMenu />
      </header>

      <div className="p-2 shrink-0">
        <Button onClick={onNewAgent} className="w-full h-9 rounded-lg" variant="secondary">
          <Plus className="h-4 w-4 mr-2" />
          New Agent
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <ul className="p-1 space-y-0.5">
          {agents.map((agent) => (
            <li key={agent.id}>
              <div
                className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                  selectedId === agent.id ? "bg-secondary" : "hover:bg-secondary/60"
                }`}
                onClick={() => onSelect(agent.id)}
              >
                <span className="truncate flex-1">{agent.name}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={(props) => (
                      <button
                        {...props}
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded flex items-center justify-center hover:bg-background transition-opacity"
                        aria-label="Agent actions"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    )}
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(agent.id)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(agent.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </aside>
  );
}
