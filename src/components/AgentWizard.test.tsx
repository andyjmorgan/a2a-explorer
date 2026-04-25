import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentWizard } from "./AgentWizard";
import { useAuthStore } from "@/lib/authStore";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const publicCard = {
  name: "k3s-agentling",
  description: "manages the cluster",
  version: "0.1.0",
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  skills: [],
};

const gatedCard = {
  ...publicCard,
  securitySchemes: {
    apiKey: {
      apiKeySecurityScheme: { location: "header", name: "X-API-Key" },
    },
  },
};

describe("AgentWizard", () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens("test-token", null, 3600);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().logout();
  });

  test("step 1 Cancel invokes the callback", async () => {
    const onCancel = vi.fn();
    render(<AgentWizard onSaved={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  test("Discover with a valid URL fetches the card and advances to review", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(publicCard));
    vi.stubGlobal("fetch", fetchMock);

    render(<AgentWizard onSaved={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(
      screen.getByPlaceholderText(/agent\.example\.com/i),
      "https://agent.example.com"
    );
    await userEvent.click(screen.getByRole("button", { name: /discover/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /confirm agent/i })).toBeInTheDocument();
    });
    // Card summary appears
    expect(screen.getByText("k3s-agentling")).toBeInTheDocument();
    // Default name carried over
    expect(screen.getByDisplayValue("k3s-agentling")).toBeInTheDocument();
    expect(screen.getByText(/no authentication required/i)).toBeInTheDocument();
  });

  test("Discover against a gated card reveals auth fields pre-filled with detected header name", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(gatedCard));
    vi.stubGlobal("fetch", fetchMock);

    render(<AgentWizard onSaved={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(
      screen.getByPlaceholderText(/agent\.example\.com/i),
      "https://agent.example.com"
    );
    await userEvent.click(screen.getByRole("button", { name: /discover/i }));

    await waitFor(() => {
      expect(screen.getByText(/requires a header/i)).toBeInTheDocument();
    });
    // Detected header name auto-populated
    expect(screen.getByDisplayValue("X-API-Key")).toBeInTheDocument();
  });

  test("Discover error surfaces in the step-1 banner", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("boom", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AgentWizard onSaved={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(
      screen.getByPlaceholderText(/agent\.example\.com/i),
      "https://agent.example.com"
    );
    await userEvent.click(screen.getByRole("button", { name: /discover/i }));

    await waitFor(() => {
      expect(screen.getByText(/502/)).toBeInTheDocument();
    });
  });

  test("Save after discovery + filling auth POSTs to create and calls onSaved", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(gatedCard)) // /test-connection
      .mockResolvedValueOnce(
        jsonResponse(
          {
            id: "new-id",
            name: "k3s-agentling",
            baseUrl: "https://agent.example.com",
            authMode: "Header",
            authHeaderName: "X-API-Key",
            hasAuthHeaderValue: true,
            createdAt: "2026-01-01T00:00:00Z",
          },
          201
        )
      );
    vi.stubGlobal("fetch", fetchMock);
    const onSaved = vi.fn();

    render(<AgentWizard onSaved={onSaved} onCancel={vi.fn()} />);
    await userEvent.type(
      screen.getByPlaceholderText(/agent\.example\.com/i),
      "https://agent.example.com"
    );
    await userEvent.click(screen.getByRole("button", { name: /discover/i }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /confirm agent/i })).toBeInTheDocument()
    );

    await userEvent.type(screen.getByPlaceholderText(/secret-token/i), "super-secret");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/agents",
      expect.objectContaining({ method: "POST" })
    );
  });

  test("Back button on step 2 returns to step 1", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(publicCard));
    vi.stubGlobal("fetch", fetchMock);

    render(<AgentWizard onSaved={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(
      screen.getByPlaceholderText(/agent\.example\.com/i),
      "https://agent.example.com"
    );
    await userEvent.click(screen.getByRole("button", { name: /discover/i }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /confirm agent/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByRole("heading", { name: /new agent/i })).toBeInTheDocument();
  });

  test("Edit mode opens directly on review with existing values", () => {
    render(
      <AgentWizard
        editing={{
          id: "1",
          name: "Existing",
          baseUrl: "https://existing.example.com",
          authMode: "Header",
          authHeaderName: "X-API-Key",
          hasAuthHeaderValue: true,
          createdAt: "2026-01-01T00:00:00Z",
        }}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole("heading", { name: /edit existing/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing")).toBeInTheDocument();
    expect(screen.getByDisplayValue("X-API-Key")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument();
  });
});
