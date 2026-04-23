import { beforeEach, describe, expect, test, vi } from "vitest";
import { parseJwt, useAuthStore } from "./authStore";

function makeJwt(payload: Record<string, unknown>): string {
  const base64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${base64({ alg: "none" })}.${base64(payload)}.sig`;
}

describe("parseJwt", () => {
  test("decodes the payload section", () => {
    const token = makeJwt({ sub: "abc", email: "u@example.test" });
    expect(parseJwt(token)).toEqual({ sub: "abc", email: "u@example.test" });
  });

  test("returns null for a malformed token", () => {
    expect(parseJwt("not-a-jwt")).toBeNull();
  });
});

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  test("setTokens flips authenticated and stores expiry", () => {
    const store = useAuthStore.getState();
    store.setTokens("a", "r", 300);
    const next = useAuthStore.getState();
    expect(next.accessToken).toBe("a");
    expect(next.refreshToken).toBe("r");
    expect(next.isAuthenticated).toBe(true);
    expect(next.tokenLifetimeSeconds).toBe(300);
    expect(next.expiresAt).toBeGreaterThan(Date.now());
  });

  test("isTokenExpired respects the 30s buffer", () => {
    const store = useAuthStore.getState();
    store.setTokens("a", "r", 60);
    expect(useAuthStore.getState().isTokenExpired()).toBe(false);

    // Simulate 35s from now: within the 30s buffer → considered expired.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 35_000));
    expect(useAuthStore.getState().isTokenExpired()).toBe(true);
    vi.useRealTimers();
  });

  test("shouldRefreshToken fires in the last 20% of the window", () => {
    const store = useAuthStore.getState();
    store.setTokens("a", "r", 100);
    // At t=0: well outside refresh window.
    expect(useAuthStore.getState().shouldRefreshToken()).toBe(false);

    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 81_000));
    expect(useAuthStore.getState().shouldRefreshToken()).toBe(true);
    vi.useRealTimers();
  });

  test("refreshTokens updates state on successful POST", async () => {
    const store = useAuthStore.getState();
    store.setTokens("old", "refresh-1", 60);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: "new", refreshToken: "refresh-2", expiresIn: 120 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const ok = await useAuthStore.getState().refreshTokens();
    expect(ok).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe("new");
    expect(useAuthStore.getState().refreshToken).toBe("refresh-2");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/refresh",
      expect.objectContaining({ method: "POST" })
    );
    vi.unstubAllGlobals();
  });

  test("refreshTokens logs out on 4xx response", async () => {
    const store = useAuthStore.getState();
    store.setTokens("old", "refresh-bad", 60);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) }));

    const ok = await useAuthStore.getState().refreshTokens();
    expect(ok).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    vi.unstubAllGlobals();
  });

  test("refreshTokens returns false when no refresh token is stored", async () => {
    const ok = await useAuthStore.getState().refreshTokens();
    expect(ok).toBe(false);
  });

  test("logout clears every credential field", () => {
    const store = useAuthStore.getState();
    store.setTokens("a", "r", 60);
    store.setUser({ id: "u", email: "u@example.test" });
    store.logout();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});
