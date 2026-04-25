import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bot, ChevronDown, ChevronUp, Info, Loader2 } from "lucide-react";
import { AgentCardsGrid } from "@/components/AgentCardsGrid";
import { AgentsSidebar } from "@/components/AgentsSidebar";
import { AgentCardPreview } from "@/components/AgentCardPreview";
import { AgentWizard } from "@/components/AgentWizard";
import { AppHeader } from "@/components/AppHeader";
import { ChatPanel } from "@/components/ChatPanel";
import { shadeOf } from "@/components/AgentShade";
import { agentsApi, a2aApi, ApiError } from "@/lib/api";
import type { AgentCard } from "@/types/a2a";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

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
      <div className="h-screen flex flex-col">
        <AppHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading your agents…</span>
        </div>
      </div>
    );
  }

  const selected = selectedId ? agents.find((a) => a.id === selectedId) : null;

  const handleSelectFromSidebar = (id: string) => {
    setSelectedId(id);
    closeSidebar();
  };
  const handleEditFromSidebar = (id: string) => {
    closeSidebar();
    handleEdit(id);
  };
  const handleDeleteFromSidebar = (id: string) => {
    closeSidebar();
    handleDelete(id);
  };
  const handleNewAgentFromSidebar = () => {
    closeSidebar();
    setWizard({ mode: "new" });
  };

  return (
    <div className="h-screen flex flex-col">
      <AppHeader onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex-1 min-h-0 flex">
        <AgentsSidebar
          agents={agents}
          selectedId={selectedId}
          onSelect={handleSelectFromSidebar}
          onNewAgent={handleNewAgentFromSidebar}
          onEdit={handleEditFromSidebar}
          onDelete={handleDeleteFromSidebar}
          open={sidebarOpen}
          onClose={closeSidebar}
        />

        <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
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
            <AgentCardsGrid
              agents={agents}
              onSelect={setSelectedId}
              onNewAgent={() => setWizard({ mode: "new" })}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function SelectedAgent({ summary }: { summary: AgentSummary }) {
  const [card, setCard] = useState<AgentCard | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);

  useEffect(() => {
    setCard(null);
    setCardError(null);
    setCardOpen(false);
    let cancelled = false;
    (async () => {
      setCardLoading(true);
      try {
        const fetched = await a2aApi.getCard(summary.id);
        if (!cancelled) setCard(fetched);
      } catch (err) {
        if (!cancelled) setCardError(messageFromError(err));
      } finally {
        if (!cancelled) setCardLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [summary.id]);

  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-border/50 shrink-0 bg-card/80 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setCardOpen((v) => !v)}
          className="w-full h-12 flex items-center px-4 gap-3 text-left hover:bg-secondary/30 transition-colors"
        >
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${shadeOf(summary.iconShade).gradient} flex items-center justify-center shrink-0`}>
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-sm font-semibold truncate">{summary.name}</span>
            <span className="hidden sm:inline text-xs text-muted-foreground truncate">{summary.baseUrl}</span>
          </div>
          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {cardOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
        </button>
        {cardOpen && (
          <div className="px-4 pb-4">
            {cardLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Fetching agent card…
              </div>
            )}
            {cardError && !cardLoading && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                Couldn't load the card: {cardError}
              </div>
            )}
            {card && !cardLoading && (
              <AgentCardPreview card={card} baseUrl={summary.baseUrl} iconShade={summary.iconShade} />
            )}
          </div>
        )}
      </header>
      <ChatPanel agentId={summary.id} iconShade={summary.iconShade} />
    </div>
  );
}

function messageFromError(err: unknown): string {
  if (err instanceof ApiError) return `${err.status}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}
