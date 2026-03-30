import { useState, useCallback } from "react";
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
      <div className="min-h-screen relative">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <ConnectPanel onDiscover={handleDiscover} loading={loading} error={error} />
      </div>
    );
  }

  if (state.step === "auth") {
    return (
      <div className="min-h-screen relative">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <AuthPrompt card={state.card} onSubmit={handleAuth} onBack={handleDisconnect} />
      </div>
    );
  }

  const { card, client } = state;

  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 border-b border-border/50 flex items-center px-4 gap-3 shrink-0 bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDisconnect}
          className="h-8 w-8 rounded-lg shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm shadow-cyan-500/20 shrink-0">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold truncate">{card.name}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-primary/20 text-primary">
            v{card.version}
          </Badge>
        </div>
        <ThemeToggle />
      </header>

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
