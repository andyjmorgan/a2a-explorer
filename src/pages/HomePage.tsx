import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bot, Loader2 } from "lucide-react";
import { AgentsSidebar } from "@/components/AgentsSidebar";
import { AgentWizard } from "@/components/AgentWizard";
import { ChatPanel } from "@/components/ChatPanel";
import { agentsApi, ApiError } from "@/lib/api";
import type { AgentDetails, AgentSummary } from "@/types/saved-agent";

type WizardState =
  | { mode: "hidden" }
  | { mode: "new" }
  | { mode: "edit"; editing: AgentDetails };

export function HomePage() {
  const [agents, setAgents] = useState<AgentSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizard, setWizard] = useState<WizardState>({ mode: "hidden" });
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const list = await agentsApi.list();
      setAgents(list);
      if (list.length === 0) {
        setWizard({ mode: "new" });
      }
    } catch (err) {
      setError(messageFromError(err));
      setAgents([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleEdit = useCallback(async (id: string) => {
    try {
      const details = await agentsApi.get(id);
      setWizard({ mode: "edit", editing: details });
    } catch (err) {
      setError(messageFromError(err));
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await agentsApi.delete(id);
        if (selectedId === id) setSelectedId(null);
        await refresh();
      } catch (err) {
        setError(messageFromError(err));
      }
    },
    [refresh, selectedId]
  );

  const handleSaved = useCallback(
    async (details: AgentDetails) => {
      setWizard({ mode: "hidden" });
      await refresh();
      setSelectedId(details.id);
    },
    [refresh]
  );

  if (agents === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading your agents…</span>
      </div>
    );
  }

  const selected = selectedId ? agents.find((a) => a.id === selectedId) : null;

  return (
    <div className="flex min-h-screen">
      <AgentsSidebar
        agents={agents}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onNewAgent={() => setWizard({ mode: "new" })}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <main className="flex-1 min-w-0">
        {error && (
          <div className="m-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {wizard.mode !== "hidden" ? (
          <AgentWizard
            editing={wizard.mode === "edit" ? wizard.editing : null}
            onSaved={handleSaved}
            onCancel={() => setWizard({ mode: "hidden" })}
          />
        ) : selected ? (
          <SelectedAgent summary={selected} />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-muted-foreground">
            <Bot className="h-8 w-8" />
            <span className="text-sm">Select an agent to get started.</span>
          </div>
        )}
      </main>
    </div>
  );
}

function SelectedAgent({ summary }: { summary: AgentSummary }) {
  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 border-b border-border/50 flex items-center px-4 gap-3 shrink-0 bg-card/80 backdrop-blur-sm">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold truncate">{summary.name}</span>
          <span className="text-xs text-muted-foreground truncate">{summary.baseUrl}</span>
        </div>
      </header>
      <ChatPanel agentId={summary.id} />
    </div>
  );
}

function messageFromError(err: unknown): string {
  if (err instanceof ApiError) return `${err.status}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}
