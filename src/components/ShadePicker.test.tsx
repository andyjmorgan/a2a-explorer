import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShadePicker } from "./ShadePicker";
import { AGENT_SHADES } from "./AgentShade";

describe("ShadePicker", () => {
  test("renders one button per shade and marks the selected one", () => {
    render(<ShadePicker value="violet" onChange={vi.fn()} />);
    expect(screen.getAllByRole("button").length).toBe(AGENT_SHADES.length);
    expect(screen.getByRole("button", { name: /violet/i, pressed: true })).toBeInTheDocument();
  });

  test("clicking a swatch invokes onChange with its id", async () => {
    const onChange = vi.fn();
    render(<ShadePicker value="cyan" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /amber/i }));
    expect(onChange).toHaveBeenCalledWith("amber");
  });
});
