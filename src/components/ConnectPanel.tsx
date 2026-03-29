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
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
        <CardContent className="pt-8 pb-8 px-8 space-y-6">
          <div className="text-center space-y-2">
            <img src={donkeyworkLogo} alt="DonkeyWork" className="w-16 h-16 mb-2 mx-auto" />
            <h1 className="text-2xl font-semibold tracking-tight">A2A Explorer</h1>
            <p className="text-sm text-muted-foreground">
              Connect to an A2A agent to discover its capabilities and chat
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Agent Base URL</label>
              <Input
                placeholder="https://agent.example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                className="h-11 rounded-xl bg-secondary/50 border-border/50 focus:border-primary focus:ring-primary/20"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleConnect}
              disabled={loading || !url.trim()}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Discovering Agent...
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
    </div>
  );
}
