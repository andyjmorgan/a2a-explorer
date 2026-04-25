import { useAuthStore } from "./authStore";

/**
 * fetch wrapper that attaches the stored Bearer token, proactively refreshes when close to expiry,
 * retries once on 401 after refreshing, and logs out + redirects to /login on a final auth failure.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
  { retry = true }: { retry?: boolean } = {}
): Promise<Response> {
  const store = useAuthStore.getState();

  if (store.isAuthenticated && (store.isTokenExpired() || store.shouldRefreshToken())) {
    const refreshed = await store.refreshTokens();
    if (!refreshed && retry) {
      redirectToLogin();
      throw new Error("Session expired");
    }
  }

  const accessToken = useAuthStore.getState().accessToken;
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401 && retry) {
    const refreshed = await useAuthStore.getState().refreshTokens();
    if (refreshed) {
      return fetchWithAuth(input, init, { retry: false });
    }
    redirectToLogin();
    throw new Error("Session expired");
  }

  return response;
}

function redirectToLogin() {
  useAuthStore.getState().logout();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}
