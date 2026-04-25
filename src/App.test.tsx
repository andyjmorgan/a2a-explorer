import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { useAuthStore } from "@/lib/authStore";

describe("App routing", () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    useAuthStore.setState({ hasHydrated: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.setState({ hasHydrated: false });
  });

  test("/login renders the login page", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: /sign in with github/i })).toBeInTheDocument();
  });

  test("/login/callback renders the callback loader", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/login/callback", hash: "" }]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/missing tokens/i)).toBeInTheDocument();
  });

  test("/ redirects to /login when unauthenticated", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: /sign in with github/i })).toBeInTheDocument();
  });

  test("unknown path renders the 404 page", () => {
    render(
      <MemoryRouter initialEntries={["/does-not-exist"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("404")).toBeInTheDocument();
  });
});
