import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore, parseJwt } from "@/lib/authStore";

export function LoginCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);

    const errorCode = params.get("error");
    if (errorCode) {
      const description = params.get("error_description") ?? errorCode;
      setError(description);
      const timeout = setTimeout(() => navigate("/login", { replace: true }), 2000);
      return () => clearTimeout(timeout);
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const expiresIn = Number(params.get("expires_in") ?? 0);

    if (!accessToken || !expiresIn) {
      setError("Missing tokens in callback fragment");
      const timeout = setTimeout(() => navigate("/login", { replace: true }), 2000);
      return () => clearTimeout(timeout);
    }

    const store = useAuthStore.getState();
    store.setTokens(accessToken, refreshToken, expiresIn);

    const payload = parseJwt(accessToken);
    if (payload?.sub) {
      store.setUser({
        id: String(payload.sub),
        email: typeof payload.email === "string" ? payload.email : undefined,
        name: typeof payload.name === "string" ? payload.name : undefined,
        username: typeof payload.preferred_username === "string" ? payload.preferred_username : undefined,
      });
    }

    navigate("/", { replace: true });
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {error ? (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm max-w-md text-center">
          {error}
          <div className="mt-2 text-xs text-muted-foreground">Redirecting back to login…</div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Signing you in…</span>
        </div>
      )}
    </div>
  );
}
