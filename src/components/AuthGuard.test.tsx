import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthGuard } from "./AuthGuard";
import { useAuthStore } from "@/lib/authStore";

function renderRoutes() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/" element={<AuthGuard><div>protected</div></AuthGuard>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AuthGuard", () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    useAuthStore.setState({ hasHydrated: false });
  });
  afterEach(() => {
    useAuthStore.setState({ hasHydrated: false });
  });

  test("redirects unauthenticated users to /login after hydration", async () => {
    useAuthStore.setState({ hasHydrated: true });
    renderRoutes();
    await waitFor(() => {
      expect(screen.getByText("login page")).toBeInTheDocument();
    });
  });

  test("renders protected content when authenticated", async () => {
    useAuthStore.getState().setTokens("token", null, 300);
    useAuthStore.setState({ hasHydrated: true });
    renderRoutes();
    await waitFor(() => {
      expect(screen.getByText("protected")).toBeInTheDocument();
    });
  });

  test("shows a spinner until hydrated", () => {
    renderRoutes();
    // hasHydrated is false; neither branch should render yet.
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
    expect(screen.queryByText("login page")).not.toBeInTheDocument();
  });
});
