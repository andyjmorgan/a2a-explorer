import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    window.localStorage.removeItem("a2a-explorer-theme");
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("hydrates from localStorage on mount", () => {
    window.localStorage.setItem("a2a-explorer-theme", "dark");
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  test("clicking the button toggles the theme and persists it", async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /toggle theme/i });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    await userEvent.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("a2a-explorer-theme")).toBe("dark");

    await userEvent.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("a2a-explorer-theme")).toBe("light");
  });

  test("falls back to prefers-color-scheme when no stored theme", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList);

    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
