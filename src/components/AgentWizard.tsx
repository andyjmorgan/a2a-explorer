import { useState } from "react";
import { ArrowLeft, ArrowRight, Globe, Loader2, Save, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgentCardPreview } from "./AgentCardPreview";
import { agentsApi, a2aApi, ApiError } from "@/lib/api";
import type { AgentCard } from "@/types/a2a";
import type { AgentAuthMode, AgentDetails } from "@/types/saved-agent";

interface AgentWizardProps {
  editing?: AgentDetails | null;
  onSaved: (details: AgentDetails) => void;
  onCancel: () => void;
}

type Phase = "url" | "review";

export function AgentWizard({ editing, onSaved, onCancel }: AgentWizardProps) {
  const [phase, setPhase] = useState<Phase>(editing ? "review" : "url");
  const [baseUrl, setBaseUrl] = useState(editing?.baseUrl ?? "");
  const [discoveryHeaderName, setDiscoveryHeaderName] = useState("");
  const [discoveryHeaderValue, setDiscoveryHeaderValue] = useState("");
  const [card, setCard] = useState<AgentCard | null>(null);
  const [name, setName] = useState(editing?.name ?? "");
  const [authHeaderName, setAuthHeaderName] = useState(editing?.authHeaderName ?? "");
  const [authHeaderValue, setAuthHeaderValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authMode: AgentAuthMode = editing
    ? editing.authMode
    : card && cardRequiresAuth(card)
    ? "Header"
    : "None";

  const handleDiscover = async () => {
    if (!baseUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const fetched = await a2aApi.testConnection({
        baseUrl: baseUrl.trim(),
        authHeaderName: discoveryHeaderName.trim() || undefined,
        authHeaderValue: discoveryHeaderValue || undefined,
      });
      setCard(fetched);
      if (!name.trim()) setName(fetched.name);

      const detected = detectApiKeyHeader(fetched);
      if (detected) {
        setAuthHeaderName(detected);
      } else if (discoveryHeaderName.trim()) {
        setAuthHeaderName(discoveryHeaderName.trim());
      }
      if (discoveryHeaderValue) setAuthHeaderValue(discoveryHeaderValue);

      setPhase("review");
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
      const payload = {
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        authMode,
        authHeaderName: authMode === "Header" ? authHeaderName.trim() : undefined,
        authHeaderValue: authMode === "Header" ? authHeaderValue || undefined : undefined,
      };
      const details = editing
        ? await agentsApi.update(editing.id, payload)
        : await agentsApi.create(payload);
      onSaved(details);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  };

  const stepLabel = editing
    ? "Edit"
    : phase === "url"
    ? "Step 1 of 2 · Discover"
    : "Step 2 of 2 · Confirm";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8 pt-5 sm:pt-6 pb-6">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {stepLabel}
        </div>
        <h1 className="text-2xl font-semibold mt-1">
          {editing ? `Edit ${editing.name}` : phase === "url" ? "New agent" : "Confirm agent"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {phase === "url"
            ? "Point A2A Explorer at an agent's base URL. We'll fetch its card server-side so your credentials never leave the backend."
            : editing
            ? "Update the agent's metadata or rotate its auth header."
            : "We discovered the agent card. Name it, add credentials if needed, then save."}
        </p>

        <div className="mt-6 space-y-5 sm:space-y-6">
          {phase === "url" ? (
            <UrlStep
              baseUrl={baseUrl}
              setBaseUrl={setBaseUrl}
              discoveryHeaderName={discoveryHeaderName}
              setDiscoveryHeaderName={setDiscoveryHeaderName}
              discoveryHeaderValue={discoveryHeaderValue}
              setDiscoveryHeaderValue={setDiscoveryHeaderValue}
              loading={loading}
              error={error}
              onDiscover={handleDiscover}
            />
          ) : (
            <ReviewStep
              editing={editing}
              card={card}
              baseUrl={baseUrl}
              name={name}
              setName={setName}
              authMode={authMode}
              authHeaderName={authHeaderName}
              setAuthHeaderName={setAuthHeaderName}
              authHeaderValue={authHeaderValue}
              setAuthHeaderValue={setAuthHeaderValue}
              error={error}
            />
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-2">
          {phase === "url" ? (
            <>
              <Button variant="outline" onClick={onCancel} disabled={loading} className="h-9">
                Cancel
              </Button>
              <div className="flex-1" />
              <Button
                onClick={handleDiscover}
                disabled={loading || !baseUrl.trim()}
                className="h-9 bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/25 text-white"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4 mr-2" />
                )}
                Discover
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => (editing ? onCancel() : setPhase("url"))}
                disabled={loading}
                className="h-9"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {editing ? "Cancel" : "Back"}
              </Button>
              <div className="flex-1" />
              <Button
                onClick={handleSave}
                disabled={loading || !canSave({ name, baseUrl, authMode, authHeaderName, authHeaderValue, hasExistingSecret: editing?.hasAuthHeaderValue ?? false })}
                className="h-9 bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/25 text-white"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface UrlStepProps {
  baseUrl: string;
  setBaseUrl: (v: string) => void;
  discoveryHeaderName: string;
  setDiscoveryHeaderName: (v: string) => void;
  discoveryHeaderValue: string;
  setDiscoveryHeaderValue: (v: string) => void;
  loading: boolean;
  error: string | null;
  onDiscover: () => void;
}

function UrlStep(props: UrlStepProps) {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="space-y-5">
      <Section title="Agent base URL" description="The root URL we'll fetch the agent card from.">
        <Input
          placeholder="https://agent.example.com"
          value={props.baseUrl}
          onChange={(e) => props.setBaseUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && props.baseUrl.trim()) props.onDiscover();
          }}
          className="h-11"
        />
      </Section>

      <Section title="Optional credentials for discovery" description="Most agents serve their card publicly. Fill these in only if the agent gates its `/.well-known/agent-card.json` behind an API key.">
        {!authOpen ? (
          <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)}>
            Provide credentials
          </Button>
        ) : (
          <div className="space-y-3">
            <Field label="Header name">
              <Input
                placeholder="X-API-Key"
                value={props.discoveryHeaderName}
                onChange={(e) => props.setDiscoveryHeaderName(e.target.value)}
              />
            </Field>
            <Field label="Header value">
              <Input
                type="password"
                placeholder="secret-token"
                value={props.discoveryHeaderValue}
                onChange={(e) => props.setDiscoveryHeaderValue(e.target.value)}
              />
            </Field>
          </div>
        )}
      </Section>

      {props.error && <ErrorBanner message={props.error} />}
    </div>
  );
}

interface ReviewStepProps {
  editing?: AgentDetails | null;
  card: AgentCard | null;
  baseUrl: string;
  name: string;
  setName: (v: string) => void;
  authMode: AgentAuthMode;
  authHeaderName: string;
  setAuthHeaderName: (v: string) => void;
  authHeaderValue: string;
  setAuthHeaderValue: (v: string) => void;
  error: string | null;
}

function ReviewStep(props: ReviewStepProps) {
  const needsAuth = props.authMode === "Header";
  const hasExistingSecret = props.editing?.hasAuthHeaderValue ?? false;

  return (
    <div className="space-y-5">
      {props.card && <AgentCardPreview card={props.card} baseUrl={props.baseUrl} />}

      <Section title="Name" description="Your label for this agent in the sidebar.">
        <Input
          placeholder="My agent"
          value={props.name}
          onChange={(e) => props.setName(e.target.value)}
          className="h-11"
        />
      </Section>

      {needsAuth ? (
        <Section
          title="Authentication"
          description="The agent advertises a security scheme. The header value is encrypted at rest with pgcrypto."
        >
          <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-200">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>This agent requires a header.</span>
            </div>
            <Field label="Header name">
              <Input
                placeholder="X-API-Key"
                value={props.authHeaderName}
                onChange={(e) => props.setAuthHeaderName(e.target.value)}
              />
            </Field>
            <Field label={hasExistingSecret ? "Header value (leave blank to keep existing)" : "Header value"}>
              <Input
                type="password"
                placeholder={hasExistingSecret ? "••••••••" : "secret-token"}
                value={props.authHeaderValue}
                onChange={(e) => props.setAuthHeaderValue(e.target.value)}
              />
            </Field>
          </div>
        </Section>
      ) : (
        <Section title="Authentication" description="Detected from the agent card.">
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-200">
            <ShieldCheck className="h-4 w-4" />
            No authentication required.
          </div>
        </Section>
      )}

      {props.error && <ErrorBanner message={props.error} />}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function cardRequiresAuth(card: AgentCard): boolean {
  return !!card.securitySchemes && Object.keys(card.securitySchemes).length > 0;
}

function detectApiKeyHeader(card: AgentCard): string | null {
  if (!card.securitySchemes) return null;
  for (const value of Object.values(card.securitySchemes)) {
    const apiKey = (value as { apiKeySecurityScheme?: { location?: string; name?: string } })
      ?.apiKeySecurityScheme;
    if (apiKey?.location === "header" && apiKey.name) {
      return apiKey.name;
    }
  }
  return null;
}

function canSave(args: {
  name: string;
  baseUrl: string;
  authMode: AgentAuthMode;
  authHeaderName: string;
  authHeaderValue: string;
  hasExistingSecret: boolean;
}): boolean {
  if (!args.name.trim() || !args.baseUrl.trim()) return false;
  if (args.authMode !== "Header") return true;
  if (!args.authHeaderName.trim()) return false;
  return args.hasExistingSecret || args.authHeaderValue.length > 0;
}

function messageFromError(err: unknown): string {
  if (err instanceof ApiError) return `${err.status}: ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
}
