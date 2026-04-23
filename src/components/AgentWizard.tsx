import { useEffect, useState } from "react";
import { Globe, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { agentsApi, a2aApi, ApiError } from "@/lib/api";
import type { AgentCard } from "@/types/a2a";
import type { AgentAuthMode, AgentDetails } from "@/types/saved-agent";

interface AgentWizardProps {
  editing?: AgentDetails | null;
  onSaved: (details: AgentDetails) => void;
  onCancel: () => void;
}

export function AgentWizard({ editing, onSaved, onCancel }: AgentWizardProps) {
  const [name, setName] = useState(editing?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(editing?.baseUrl ?? "");
  const [authMode, setAuthMode] = useState<AgentAuthMode>(editing?.authMode ?? "None");
  const [authHeaderName, setAuthHeaderName] = useState(editing?.authHeaderName ?? "");
  const [authHeaderValue, setAuthHeaderValue] = useState("");
  const [card, setCard] = useState<AgentCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setCard(null);
  }, [baseUrl, authMode, authHeaderName, authHeaderValue]);

  const canSave = name.trim() && baseUrl.trim() && (authMode === "None" || authHeaderName.trim());

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await a2aApi.testConnection({
        baseUrl: baseUrl.trim(),
        authHeaderName: authMode === "Header" ? authHeaderName.trim() : undefined,
        authHeaderValue: authMode === "Header" ? authHeaderValue || undefined : undefined,
      });
      setCard(fetched);
      if (!name.trim()) {
        setName(fetched.name);
      }
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const details = editing
        ? await agentsApi.update(editing.id, {
            name: name.trim(),
            baseUrl: baseUrl.trim(),
            authMode,
            authHeaderName: authMode === "Header" ? authHeaderName.trim() : null,
            authHeaderValue: authMode === "Header" && authHeaderValue ? authHeaderValue : undefined,
          } as never)
        : await agentsApi.create({
            name: name.trim(),
            baseUrl: baseUrl.trim(),
            authMode,
            authHeaderName: authMode === "Header" ? authHeaderName.trim() : undefined,
            authHeaderValue: authMode === "Header" ? authHeaderValue || undefined : undefined,
          });
      onSaved(details);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6">
      <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
        <CardContent className="pt-8 pb-8 px-8 space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{editing ? "Edit agent" : "New agent"}</h2>
            <p className="text-xs text-muted-foreground">
              Point A2A Explorer at an agent's base URL. We'll fetch its agent card via our server —
              your credentials never leave the backend.
            </p>
          </div>

          <div className="space-y-4">
            <Field label="Name">
              <Input
                placeholder="My agent"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field label="Agent Base URL">
              <Input
                placeholder="https://agent.example.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </Field>

            <Field label="Authentication">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={authMode === "None" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAuthMode("None")}
                >
                  None
                </Button>
                <Button
                  type="button"
                  variant={authMode === "Header" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAuthMode("Header")}
                >
                  Header
                </Button>
              </div>
            </Field>

            {authMode === "Header" && (
              <>
                <Field label="Header name">
                  <Input
                    placeholder="X-API-Key"
                    value={authHeaderName}
                    onChange={(e) => setAuthHeaderName(e.target.value)}
                  />
                </Field>
                <Field label={editing?.hasAuthHeaderValue ? "Header value (leave blank to keep existing)" : "Header value"}>
                  <Input
                    type="password"
                    placeholder={editing?.hasAuthHeaderValue ? "••••••••" : "secret-token"}
                    value={authHeaderValue}
                    onChange={(e) => setAuthHeaderValue(e.target.value)}
                  />
                </Field>
              </>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {card && !error && (
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-sm">
                <div className="font-medium">{card.name}</div>
                <div className="text-xs text-muted-foreground">v{card.version} — {card.description}</div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" onClick={onCancel} disabled={loading} className="h-9">
                Cancel
              </Button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                onClick={handleTest}
                disabled={loading || !baseUrl.trim() || (authMode === "Header" && !authHeaderName.trim())}
                className="h-9"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                Test
              </Button>
              <Button onClick={handleSave} disabled={loading || !canSave} className="h-9">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function messageFromError(err: unknown): string {
  if (err instanceof ApiError) return `${err.status}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}
