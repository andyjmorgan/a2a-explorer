import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LoginCallbackPage } from "./LoginCallbackPage";
import { useAuthStore } from "@/lib/authStore";

function encodePayload(payload: Record<string, unknown>): string {
  return btoa(JSON.stringify(payload)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

describe("LoginCallbackPage", () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });
  afterEach(() => vi.unstubAllGlobals());

  test("parses tokens from URL fragment, hydrates store, navigates home", async () => {
    const token = `header.${encodePayload({ sub: "user-1", email: "u@example.test", name: "User One", preferred_username: "uone" })}.sig`;
    window.history.replaceState({}, "", `/login/callback#access_token=${token}&refresh_token=r1&expires_in=300&token_type=Bearer`);

    render(
      <MemoryRouter initialEntries={[{ pathname: "/login/callback", hash: `#access_token=${token}&refresh_token=r1&expires_in=300&token_type=Bearer` }]}>
        <Routes>
          <Route path="/login/callback" element={<LoginCallbackPage />} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe(token);
    expect(state.refreshToken).toBe("r1");
    expect(state.user?.id).toBe("user-1");
    expect(state.user?.email).toBe("u@example.test");
    expect(state.user?.username).toBe("uone");
  });

  test("error fragment renders a message and redirects back to /login", async () => {
    window.history.replaceState({}, "", "/login/callback#error=access_denied&error_description=user%20cancelled");

    render(
      <MemoryRouter initialEntries={[{ pathname: "/login/callback", hash: "#error=access_denied&error_description=user%20cancelled" }]}>
        <Routes>
          <Route path="/login/callback" element={<LoginCallbackPage />} />
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/user cancelled/i)).toBeInTheDocument();
  });

  test("missing access_token also triggers the error path", () => {
    window.history.replaceState({}, "", "/login/callback");
    render(
      <MemoryRouter initialEntries={[{ pathname: "/login/callback", hash: "" }]}>
        <Routes>
          <Route path="/login/callback" element={<LoginCallbackPage />} />
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/missing tokens/i)).toBeInTheDocument();
  });
});
