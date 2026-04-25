import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentCardsGrid } from "./AgentCardsGrid";
import type { AgentSummary } from "@/types/saved-agent";

const cardStub = {
  name: "Alpha",
  description: "the alpha agent",
  version: "1.0",
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  skills: [
    { id: "s1", name: "deploy", description: "deploys things", tags: ["devops", "ci"] },
    { id: "s2", name: "rollback", description: "rolls back" },
  ],
};

vi.mock("@/lib/api", () => ({
  a2aApi: {
    getCard: vi.fn(() => Promise.resolve(cardStub)),
  },
}));

const sample: AgentSummary[] = [
  {
    id: "1",
    name: "Alpha",
    baseUrl: "https://a",
    authMode: "Header",
    hasAuthHeaderValue: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
];

describe("AgentCardsGrid", () => {

  test("renders a header and a card per agent", () => {
    render(
      <AgentCardsGrid
        agents={sample}
        onSelect={vi.fn()}
        onNewAgent={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByRole("heading", { name: /your agents/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alpha/i })).toBeInTheDocument();
  });

  test("clicking a card invokes onSelect with the agent id", async () => {
    const onSelect = vi.fn();
    render(
      <AgentCardsGrid
        agents={sample}
        onSelect={onSelect}
        onNewAgent={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /Alpha/i }));
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  test("New agent button invokes onNewAgent", async () => {
    const onNewAgent = vi.fn();
    render(
      <AgentCardsGrid
        agents={[]}
        onSelect={vi.fn()}
        onNewAgent={onNewAgent}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /new agent/i }));
    expect(onNewAgent).toHaveBeenCalled();
  });

  test("renders skill tags from the loaded agent card", async () => {
    render(
      <AgentCardsGrid
        agents={sample}
        onSelect={vi.fn()}
        onNewAgent={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    await waitFor(() => expect(screen.getByText("devops")).toBeInTheDocument());
    expect(screen.getByText("ci")).toBeInTheDocument();
  });

  test("Enter key on a card triggers onSelect (keyboard accessibility)", async () => {
    const onSelect = vi.fn();
    render(
      <AgentCardsGrid
        agents={sample}
        onSelect={onSelect}
        onNewAgent={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const card = screen.getByRole("button", { name: /Alpha/i });
    card.focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  test("renders 'Last used' suffix when lastUsedAt is set", () => {
    const recent: AgentSummary = {
      ...sample[0],
      lastUsedAt: new Date(Date.now() - 90_000).toISOString(), // 90 s ago
    };
    render(
      <AgentCardsGrid
        agents={[recent]}
        onSelect={vi.fn()}
        onNewAgent={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText(/last used/i)).toBeInTheDocument();
  });

  test("Edit and Delete menu items invoke their callbacks", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <AgentCardsGrid
        agents={sample}
        onSelect={vi.fn()}
        onNewAgent={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /agent actions/i }));
    await userEvent.click(await screen.findByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith("1");

    await userEvent.click(screen.getByRole("button", { name: /agent actions/i }));
    await userEvent.click(await screen.findByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith("1");
  });
});
