import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgentCardPreview } from "./AgentCardPreview";
import type { AgentCard } from "@/types/a2a";

const baseCard: AgentCard = {
  name: "k3s-agentling",
  description: "manages the cluster",
  version: "0.1.0",
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  skills: [],
};

describe("AgentCardPreview", () => {
  test("shows name, version and description", () => {
    render(<AgentCardPreview card={baseCard} baseUrl="https://agent.example.com" />);
    expect(screen.getByText("k3s-agentling")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("manages the cluster")).toBeInTheDocument();
    expect(screen.getByText("https://agent.example.com")).toBeInTheDocument();
  });

  test("renders the streaming pill when capability is enabled", () => {
    render(
      <AgentCardPreview
        card={{ ...baseCard, capabilities: { streaming: true } }}
        baseUrl="https://agent.example.com"
      />
    );
    expect(screen.getByText("streaming")).toBeInTheDocument();
  });

  test("omits the streaming pill when capability is missing", () => {
    render(<AgentCardPreview card={baseCard} baseUrl="https://agent.example.com" />);
    expect(screen.queryByText("streaming")).toBeNull();
  });

  test("renders skill chips for each skill", () => {
    render(
      <AgentCardPreview
        card={{
          ...baseCard,
          skills: [
            { id: "s1", name: "deploy", description: "deploys things" },
            { id: "s2", name: "rollback", description: "rolls back" },
          ],
        }}
        baseUrl="https://agent.example.com"
      />
    );
    expect(screen.getByText("deploy")).toBeInTheDocument();
    expect(screen.getByText("rollback")).toBeInTheDocument();
  });
});
