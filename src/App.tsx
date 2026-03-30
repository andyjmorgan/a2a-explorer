import { useState, useCallback, type ReactNode } from "react";
import { ArrowLeft, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConnectPanel } from "@/components/ConnectPanel";
import { AuthPrompt } from "@/components/AuthPrompt";
import { AgentCardView } from "@/components/AgentCardView";
import { ChatPanel } from "@/components/ChatPanel";
import { A2AClient } from "@/lib/a2a-client";
import type { AgentCard, AuthConfig } from "@/types/a2a";

const GitHubIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
);

function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="h-12 border-b border-border/50 flex items-center px-4 gap-3 shrink-0 bg-card/80 backdrop-blur-sm sticky top-0 z-30">
      {children}
      <div className="flex-1" />
      <a
        href="https://github.com/andyjmorgan/a2a-explorer"
        target="_blank"
        rel="noopener noreferrer"
        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <GitHubIcon />
      </a>
      <ThemeToggle />
    </header>
  );
}

type AppState =
  | { step: "connect" }
  | { step: "auth"; url: string; card: AgentCard; client: A2AClient }
  | { step: "chat"; url: string; card: AgentCard; client: A2AClient };

function cardRequiresAuth(card: AgentCard): boolean {
  if (!card.securitySchemes) return false;
  return Object.keys(card.securitySchemes).length > 0;
}

export default function App() {
  const [state, setState] = useState<AppState>({ step: "connect" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDiscover = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);

    try {
      const client = new A2AClient(url);
      const card = await client.discoverCard();

      if (cardRequiresAuth(card)) {
        setState({ step: "auth", url, card, client });
      } else {
        setState({ step: "chat", url, card, client });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discover agent");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAuth = useCallback(
    (auth: AuthConfig) => {
      if (state.step !== "auth") return;
      state.client.setAuth(auth);
      setState({ step: "chat", url: state.url, card: state.card, client: state.client });
    },
    [state]
  );

  const handleDisconnect = useCallback(() => {
    setState({ step: "connect" });
    setError(null);
  }, []);

  if (state.step === "connect") {
    return (
      <div className="h-screen flex flex-col">
        <AppHeader />
        <div className="flex-1">
          <ConnectPanel onDiscover={handleDiscover} loading={loading} error={error} />
        </div>
      </div>
    );
  }

  if (state.step === "auth") {
    return (
      <div className="h-screen flex flex-col">
        <AppHeader />
        <div className="flex-1">
          <AuthPrompt card={state.card} onSubmit={handleAuth} onBack={handleDisconnect} />
        </div>
      </div>
    );
  }

  const { card, client } = state;

  return (
    <div className="h-screen flex flex-col">
      <AppHeader>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDisconnect}
          className="h-8 w-8 rounded-lg shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm shadow-cyan-500/20 shrink-0">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold truncate">{card.name}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-primary/20 text-primary">
            v{card.version}
          </Badge>
        </div>
      </AppHeader>

      <main className="flex-1 min-h-0 flex flex-col max-w-3xl mx-auto w-full">
        <div className="px-6 pt-4 shrink-0">
          <AgentCardView card={card} />
        </div>
        <div className="flex-1 min-h-0">
          <ChatPanel client={client} card={card} />
        </div>
      </main>
    </div>
  );
}
