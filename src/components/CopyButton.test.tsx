import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "./CopyButton";

describe("CopyButton", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("writes the text to the clipboard and flips to a copied state", async () => {
    render(<CopyButton text="hello world" />);
    await userEvent.click(screen.getByRole("button", { name: /copy message/i }));

    expect(writeText).toHaveBeenCalledWith("hello world");
    await waitFor(() => expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument());
  });

  test("swallows clipboard errors silently", async () => {
    writeText.mockRejectedValueOnce(new Error("permission denied"));
    render(<CopyButton text="boom" />);

    await userEvent.click(screen.getByRole("button", { name: /copy message/i }));
    // Stays in the initial state when the clipboard write rejects.
    expect(screen.getByRole("button", { name: /copy message/i })).toBeInTheDocument();
  });
});
