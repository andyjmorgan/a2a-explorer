import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useAuthStore } from "./authStore";
import { fetchWithAuth } from "./fetchWithAuth";

describe("fetchWithAuth", () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    vi.stubGlobal("location", { ...window.location, assign: vi.fn(), pathname: "/" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("attaches the stored Bearer token", async () => {
    useAuthStore.getState().setTokens("access-1", "refresh-1", 300);
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithAuth("/api/v1/agents");

    const request = fetchMock.mock.calls[0][1];
    expect((request.headers as Headers).get("Authorization")).toBe("Bearer access-1");
  });

  test("retries once after refreshing on 401", async () => {
    useAuthStore.getState().setTokens("old", "refresh-1", 300);

    const fetchMock = vi.fn()
      // 1st: /api/v1/agents → 401
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      // 2nd: /api/v1/auth/refresh → 200 with new tokens
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ accessToken: "new", refreshToken: "refresh-2", expiresIn: 300 }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      // 3rd retry: /api/v1/agents → 200
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithAuth("/api/v1/agents");
    expect(response.status).toBe(200);
    expect(useAuthStore.getState().accessToken).toBe("new");

    const retryCall = fetchMock.mock.calls[2];
    expect((retryCall[1].headers as Headers).get("Authorization")).toBe("Bearer new");
  });

  test("logs out and redirects on a double-401", async () => {
    useAuthStore.getState().setTokens("bad", "refresh-bad", 300);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    const assignMock = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign: assignMock, pathname: "/" });

    await expect(fetchWithAuth("/api/v1/agents")).rejects.toThrow("Session expired");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(assignMock).toHaveBeenCalledWith("/login");
  });

  test("pre-refreshes when the stored token is expired", async () => {
    // Expired: setTokens with 1s lifetime then fast-forward past it.
    useAuthStore.getState().setTokens("expired", "refresh-1", 1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 60_000));

    const fetchMock = vi.fn()
      // /api/v1/auth/refresh → 200
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ accessToken: "fresh", refreshToken: "refresh-2", expiresIn: 300 }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      // /api/v1/agents → 200
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithAuth("/api/v1/agents");
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/v1/auth/refresh", expect.objectContaining({ method: "POST" }));
    vi.useRealTimers();
  });

  test("does not attach Authorization when unauthenticated", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithAuth("/api/v1/agents");

    const request = fetchMock.mock.calls[0][1];
    expect((request.headers as Headers).get("Authorization")).toBeNull();
  });
});
