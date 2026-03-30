import { useState } from "react";
import { Key, Shield, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AgentCard, AuthConfig, SecurityScheme, LegacySecurityScheme } from "@/types/a2a";

interface AuthPromptProps {
  card: AgentCard;
  onSubmit: (auth: AuthConfig) => void;
  onBack: () => void;
}

interface SchemeInfo {
  type: string;
  detail: string;
  defaultHeaderName: string;
  defaultPlaceholder: string;
}

function isLegacyScheme(scheme: SecurityScheme | LegacySecurityScheme): scheme is LegacySecurityScheme {
  return "type" in scheme && typeof (scheme as LegacySecurityScheme).type === "string";
}

function describeScheme(name: string, scheme: SecurityScheme | LegacySecurityScheme): SchemeInfo {
  if (isLegacyScheme(scheme)) {
    if (scheme.type === "apiKey") {
      return {
        type: "API Key",
        detail: `${scheme.name ?? name} in ${scheme.in ?? "header"}`,
        defaultHeaderName: scheme.in === "header" ? (scheme.name ?? name) : (scheme.name ?? name),
        defaultPlaceholder: "your-api-key",
      };
    }
    if (scheme.type === "http") {
      return {
        type: "HTTP Auth",
        detail: scheme.name ?? "Bearer",
        defaultHeaderName: "Authorization",
        defaultPlaceholder: "Bearer your-token-here",
      };
    }
    return {
      type: scheme.type,
      detail: scheme.description ?? name,
      defaultHeaderName: "Authorization",
      defaultPlaceholder: "your-token",
    };
  }

  if ("httpAuthSecurityScheme" in scheme) {
    const s = scheme.httpAuthSecurityScheme;
    return {
      type: "HTTP Auth",
      detail: `${s.scheme}${s.bearerFormat ? ` (${s.bearerFormat})` : ""}`,
      defaultHeaderName: "Authorization",
      defaultPlaceholder: `${s.scheme} your-token-here`,
    };
  }
  if ("apiKeySecurityScheme" in scheme) {
    const s = scheme.apiKeySecurityScheme;
    return {
      type: "API Key",
      detail: `${s.name} in ${s.location}`,
      defaultHeaderName: s.location === "header" ? s.name : s.name,
      defaultPlaceholder: "your-api-key",
    };
  }
  if ("openIdConnectSecurityScheme" in scheme) {
    return {
      type: "OpenID Connect",
      detail: "Not yet supported in this tool",
      defaultHeaderName: "Authorization",
      defaultPlaceholder: "Bearer your-token",
    };
  }
  if ("oauth2SecurityScheme" in scheme) {
    return {
      type: "OAuth2",
      detail: "Not yet supported in this tool",
      defaultHeaderName: "Authorization",
      defaultPlaceholder: "Bearer your-token",
    };
  }
  return {
    type: "Unknown",
    detail: name,
    defaultHeaderName: "Authorization",
    defaultPlaceholder: "your-token",
  };
}

export function AuthPrompt({ card, onSubmit, onBack }: AuthPromptProps) {
  const schemes = card.securitySchemes ?? {};
  const schemeEntries = Object.entries(schemes);

  const firstEntry = schemeEntries[0];
  const described = firstEntry ? describeScheme(firstEntry[0], firstEntry[1]) : null;

  const [headerName, setHeaderName] = useState(
    import.meta.env.VITE_DEFAULT_HEADER_NAME ?? described?.defaultHeaderName ?? "Authorization"
  );
  const [headerValue, setHeaderValue] = useState(
    import.meta.env.VITE_DEFAULT_HEADER_VALUE ?? ""
  );

  const handleSubmit = () => {
    onSubmit({
      mode: "header",
      headerName,
      headerValue,
    });
  };

  return (
    <div className="flex items-center justify-center h-full p-4">
      <Card className="w-full max-w-lg border-border/50 bg-card/80 backdrop-blur-sm shadow-xl shadow-amber-500/5">
        <CardContent className="pt-8 pb-8 px-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 mb-2">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Knock knock</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{card.name}</span> wants to know who you are
            </p>
          </div>

          <div className="space-y-2">
            {schemeEntries.map(([name, scheme]) => {
              const info = describeScheme(name, scheme);
              return (
                <div
                  key={name}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/50 border border-border/30"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
                    <Key className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{name}</span>
                      <Badge variant="outline" className="text-[10px]">{info.type}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{info.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border/50">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Header Name</label>
              <Input
                placeholder="Authorization"
                value={headerName}
                onChange={(e) => setHeaderName(e.target.value)}
                className="h-9 rounded-lg bg-background/50 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Header Value</label>
              <Input
                type="password"
                placeholder={described?.defaultPlaceholder ?? "Bearer your-token-here"}
                value={headerValue}
                onChange={(e) => setHeaderValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="h-9 rounded-lg bg-background/50 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onBack}
              className="h-11 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!headerValue.trim()}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/25 text-white transition-all duration-200"
            >
              <Shield className="h-4 w-4 mr-2" />
              Let me in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
