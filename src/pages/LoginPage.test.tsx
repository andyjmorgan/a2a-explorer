import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() });
  });
  afterEach(() => vi.unstubAllGlobals());

  test("renders one icon button per identity provider", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with github/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with microsoft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with apple/i })).toBeInTheDocument();
  });

  test("clicking a provider button sends the matching idpHint", async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: /sign in with github/i }));
    expect(window.location.assign).toHaveBeenCalledWith("/api/v1/auth/login?idpHint=github");
  });
});
