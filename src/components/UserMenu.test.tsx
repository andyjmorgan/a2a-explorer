import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserMenu } from "./UserMenu";
import { useAuthStore } from "@/lib/authStore";

describe("UserMenu", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().logout();
  });

  test("renders nothing when no user is signed in", () => {
    useAuthStore.getState().logout();
    const { container } = render(<UserMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  test("renders the user's initials", () => {
    useAuthStore.getState().setUser({ id: "u", email: "u@example.test", name: "Ursula User" });
    render(<UserMenu />);
    expect(screen.getByRole("button", { name: /user menu/i })).toHaveTextContent("UU");
  });

  test("falls back to email initial when the user has no name", () => {
    useAuthStore.getState().setUser({ id: "u", email: "ursula@example.test" });
    render(<UserMenu />);
    expect(screen.getByRole("button", { name: /user menu/i })).toHaveTextContent("U");
  });

  test("clicking Log out navigates to the auth logout endpoint", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    useAuthStore.getState().setUser({ id: "u", email: "u@example.test", name: "Ursula" });

    render(<UserMenu />);
    await userEvent.click(screen.getByRole("button", { name: /user menu/i }));
    const logout = await screen.findByText(/log out/i);
    await userEvent.click(logout);

    expect(window.location.assign).toHaveBeenCalledWith("/api/v1/auth/logout");
  });
});
