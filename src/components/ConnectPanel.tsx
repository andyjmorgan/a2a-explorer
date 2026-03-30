import { useState } from "react";
import { Globe, Loader2, Github } from "lucide-react";
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
          <Github className="h-3 w-3" />
          GitHub
        </a>
      </div>
    </div>
  );
}
