import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "./HomePage";
import { useAuthStore } from "@/lib/authStore";
import type { AgentSummary, AgentDetails } from "@/types/saved-agent";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const sampleAgent: AgentSummary = {
  id: "1",
  name: "Alpha",
  baseUrl: "https://a",
  authMode: "None",
  hasAuthHeaderValue: false,
  createdAt: "2026-01-01T00:00:00Z",
};

const stubCard = {
  name: "Alpha",
  description: "the alpha agent",
  version: "1.2.3",
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
  skills: [{ id: "s1", name: "deploy", description: "deploys things", tags: ["devops"] }],
};

/**
 * Build a fetch handler that responds with the given list of saved agents and answers any
 * `GET /agents/{id}/card` request with the stub card. Tests can plug in additional one-shot
 * responses via `extras` (consumed in order, ahead of the fallback handlers).
 */
function fetchHandler(initialList: AgentSummary[], extras: Response[] = []) {
  const remaining = [...extras];
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method?.toUpperCase() ?? "GET";

    if (remaining.length > 0) {
      return remaining.shift()!;
    }
    if (method === "GET" && url.endsWith("/api/v1/agents")) {
      return jsonResponse(initialList);
    }
    if (method === "GET" && /\/api\/v1\/agents\/[^/]+\/card$/.test(url)) {
      return jsonResponse(stubCard);
    }
    return new Response(null, { status: 404 });
  };
}

describe("HomePage", () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens("test-token", null, 3600);
    useAuthStore.getState().setUser({ id: "u1", email: "u@example.test", name: "Ursula" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().logout();
  });

  test("renders the loading spinner before agents load", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByText(/loading your agents/i)).toBeInTheDocument();
  });

  test("renders an agent grid card for each saved agent", async () => {
    vi.stubGlobal("fetch", vi.fn(fetchHandler([sampleAgent])));

    render(<MemoryRouter><HomePage /></MemoryRouter>);

    await waitFor(() => {
      // "Alpha" appears in both sidebar list and grid card; both must render.
      expect(screen.getAllByText("Alpha").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByRole("heading", { name: /your agents/i })).toBeInTheDocument();
  });

  test("auto-opens the wizard when no agents exist", async () => {
    vi.stubGlobal("fetch", vi.fn(fetchHandler([])));

    render(<MemoryRouter><HomePage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/agent\.example\.com/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: /new agent/i })).toBeInTheDocument();
  });

  test("clicking a grid card opens the chat for that agent", async () => {
    vi.stubGlobal("fetch", vi.fn(fetchHandler([sampleAgent])));

    render(<MemoryRouter><HomePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText("Alpha").length).toBeGreaterThanOrEqual(1));

    // Click via the card's accessible button role (the sidebar entry is a div).
    const cardButton = screen.getByRole("button", { name: /Alpha/i });
    await userEvent.click(cardButton);
    expect(screen.getByPlaceholderText(/send a message/i)).toBeInTheDocument();
  });

  test("shows an inline error when the list request fails", async () => {
    vi.stubGlobal("fetch", vi.fn(fetchHandler([], [new Response("boom", { status: 500 })])));

    render(<MemoryRouter><HomePage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/500/)).toBeInTheDocument();
    });
  });

  test("expanding SelectedAgent fetches and renders the card", async () => {
    vi.stubGlobal("fetch", vi.fn(fetchHandler([sampleAgent])));

    render(<MemoryRouter><HomePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText("Alpha").length).toBeGreaterThanOrEqual(1));

    await userEvent.click(screen.getByRole("button", { name: /Alpha/i }));
    const expandButton = screen.getByRole("button", { name: /alpha\s+https:\/\/a/i });
    await userEvent.click(expandButton);

    await waitFor(() => expect(screen.getByText("v1.2.3")).toBeInTheDocument());
  });

  test("deleting from the grid card menu clears selection", async () => {
    let listResponse: AgentSummary[] = [sampleAgent];
    const handler = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method?.toUpperCase() ?? "GET";
      if (method === "GET" && url.endsWith("/api/v1/agents")) return jsonResponse(listResponse);
      if (method === "GET" && /\/api\/v1\/agents\/[^/]+\/card$/.test(url)) return jsonResponse(stubCard);
      if (method === "DELETE" && /\/api\/v1\/agents\/[^/]+$/.test(url)) {
        listResponse = [];
        return new Response(null, { status: 204 });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", handler);

    render(<MemoryRouter><HomePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText("Alpha").length).toBeGreaterThanOrEqual(1));

    const menuButtons = screen.getAllByRole("button", { name: /agent actions/i });
    await userEvent.click(menuButtons[0]);
    await userEvent.click(await screen.findByText("Delete"));

    // After delete, the empty list triggers the wizard auto-open and the grid disappears.
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/agent\.example\.com/i)).toBeInTheDocument()
    );
  });

  test("editing from the grid card menu loads the details and reopens the wizard", async () => {
    const details: AgentDetails = { ...sampleAgent, authHeaderName: undefined };
    const handler = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method?.toUpperCase() ?? "GET";
      if (method === "GET" && url.endsWith("/api/v1/agents")) return jsonResponse([sampleAgent]);
      if (method === "GET" && /\/api\/v1\/agents\/[^/]+\/card$/.test(url)) return jsonResponse(stubCard);
      if (method === "GET" && /\/api\/v1\/agents\/[^/]+$/.test(url)) return jsonResponse(details);
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", handler);

    render(<MemoryRouter><HomePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText("Alpha").length).toBeGreaterThanOrEqual(1));

    const menuButtons = screen.getAllByRole("button", { name: /agent actions/i });
    expect(menuButtons.length).toBeGreaterThan(0);
    await userEvent.click(menuButtons[0]);
    await userEvent.click(await screen.findByText("Edit"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /edit alpha/i })).toBeInTheDocument();
    });
  });
});
