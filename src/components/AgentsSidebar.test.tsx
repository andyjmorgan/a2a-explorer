import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentsSidebar } from "./AgentsSidebar";
import type { AgentSummary } from "@/types/saved-agent";
import { useAuthStore } from "@/lib/authStore";

const sampleAgents: AgentSummary[] = [
  { id: "1", name: "Alpha", baseUrl: "https://a", authMode: "None", hasAuthHeaderValue: false, createdAt: "2026" },
  { id: "2", name: "Beta", baseUrl: "https://b", authMode: "Header", hasAuthHeaderValue: true, createdAt: "2026" },
];

describe("AgentsSidebar", () => {
  test("renders every saved agent", () => {
    useAuthStore.getState().setUser({ id: "u", email: "u@example.test", name: "Ursula" });
    render(
      <AgentsSidebar
        agents={sampleAgents}
        selectedId={null}
        onSelect={vi.fn()}
        onNewAgent={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  test("clicking a row invokes onSelect", async () => {
    useAuthStore.getState().setUser({ id: "u", email: "u@example.test" });
    const onSelect = vi.fn();
    render(
      <AgentsSidebar
        agents={sampleAgents}
        selectedId={null}
        onSelect={onSelect}
        onNewAgent={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText("Alpha"));
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  test("New Agent button invokes onNewAgent", async () => {
    useAuthStore.getState().setUser({ id: "u", email: "u@example.test" });
    const onNewAgent = vi.fn();
    render(
      <AgentsSidebar
        agents={[]}
        selectedId={null}
        onSelect={vi.fn()}
        onNewAgent={onNewAgent}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /new agent/i }));
    expect(onNewAgent).toHaveBeenCalled();
  });
});
