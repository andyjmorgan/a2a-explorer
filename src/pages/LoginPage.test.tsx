import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() });
  });
  afterEach(() => vi.unstubAllGlobals());

  test("renders the sign-in button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /sign in with keycloak/i })).toBeInTheDocument();
  });

  test("clicking the button navigates to the backend login endpoint", async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(window.location.assign).toHaveBeenCalledWith("/api/v1/auth/login");
  });
});
