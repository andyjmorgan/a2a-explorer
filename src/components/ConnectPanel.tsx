import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import donkeyworkLogo from "/donkeywork.png";

interface ConnectPanelProps {
  onDiscover: (url: string) => void;
  loading: boolean;
  error: string | null;
}

export function ConnectPanel({ onDiscover, loading, error }: ConnectPanelProps) {
  const [url, setUrl] = useState(import.meta.env.VITE_DEFAULT_AGENT_URL ?? "");

  const handleConnect = () => {
    if (!url.trim()) return;
    onDiscover(url.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm shadow-xl shadow-cyan-500/5">
        <CardContent className="pt-8 pb-8 px-8 space-y-6">
          <div className="text-center space-y-2">
            <img src={donkeyworkLogo} alt="DonkeyWork" className="w-16 h-16 mx-auto mb-3" />
            <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
              A2A Explorer
            </h1>
            <p className="text-sm text-muted-foreground">
              Point me at an agent and let's see what it can do
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Agent Base URL
              </label>
              <Input
                placeholder="https://agent.example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                className="h-11 rounded-xl bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20"
              />
              <p className="text-[10px] text-muted-foreground/60">
                We'll fetch the agent card from <code className="text-primary/60">/.well-known/agent.json</code>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleConnect}
              disabled={loading || !url.trim()}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/25 text-white transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sniffing out the agent...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Discover
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground/50">
        <span>A DonkeyWork experiment</span>
        <span className="text-border">|</span>
        <a
          href="https://github.com/andyjmorgan/a2a-explorer"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-primary transition-colors"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          GitHub
        </a>
      </div>
    </div>
  );
}
