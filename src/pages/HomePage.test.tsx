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

  test("lists saved agents and shows the empty-select state", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([sampleAgent]));
    vi.stubGlobal("fetch", fetchMock);

    render(<MemoryRouter><HomePage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });
    expect(screen.getByText(/select an agent/i)).toBeInTheDocument();
  });

  test("auto-opens the wizard when no agents exist", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    render(<MemoryRouter><HomePage /></MemoryRouter>);

    // Wizard-specific field visible once the empty list triggers auto-open:
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/agent\.example\.com/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: /new agent/i })).toBeInTheDocument();
  });

  test("selecting an agent shows the SelectedAgent header", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([sampleAgent]));
    vi.stubGlobal("fetch", fetchMock);

    render(<MemoryRouter><HomePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    await userEvent.click(screen.getByText("Alpha"));
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
  });

  test("shows an inline error when the list request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("boom", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<MemoryRouter><HomePage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/500/)).toBeInTheDocument();
    });
  });

  test("editing loads the details and reopens the wizard", async () => {
    const details: AgentDetails = { ...sampleAgent, authHeaderName: undefined };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([sampleAgent]))  // initial list
      .mockResolvedValueOnce(jsonResponse(details)); // GET /agents/1
    vi.stubGlobal("fetch", fetchMock);

    render(<MemoryRouter><HomePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    const row = screen.getByText("Alpha").closest("div");
    const menuButton = row?.querySelector("button[aria-label='Agent actions']");
    expect(menuButton).toBeInTheDocument();
    await userEvent.click(menuButton as HTMLElement);
    await userEvent.click(await screen.findByText("Edit"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /edit alpha/i })).toBeInTheDocument();
    });
  });

  test("expanding SelectedAgent fetches and renders the card", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([sampleAgent])) // initial list
      .mockResolvedValueOnce(jsonResponse({                // GET /agents/1/card
        name: "Alpha",
        description: "the alpha agent",
        version: "1.2.3",
        defaultInputModes: ["text"],
        defaultOutputModes: ["text"],
        skills: [],
      }));
    vi.stubGlobal("fetch", fetchMock);

    render(<MemoryRouter><HomePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    await userEvent.click(screen.getByText("Alpha"));
    // The expand toggle is the only button containing the agent name + base URL header.
    const expandButton = screen.getByRole("button", { name: /alpha\s+https:\/\/a/i });
    await userEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText("v1.2.3")).toBeInTheDocument();
    });
  });

  test("SelectedAgent surfaces an error when the card fetch fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([sampleAgent]))
      .mockResolvedValueOnce(new Response("upstream", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<MemoryRouter><HomePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    await userEvent.click(screen.getByText("Alpha"));
    const expandButton = screen.getByRole("button", { name: /alpha\s+https:\/\/a/i });
    await userEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText(/couldn't load the card/i)).toBeInTheDocument();
    });
  });

  test("deleting the selected agent clears selection and refreshes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse([sampleAgent]))        // initial list
      .mockResolvedValueOnce(new Response(null, { status: 204 })) // DELETE
      .mockResolvedValueOnce(jsonResponse([]));                   // refresh → empty
    vi.stubGlobal("fetch", fetchMock);

    render(<MemoryRouter><HomePage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    await userEvent.click(screen.getByText("Alpha"));
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();

    const [sidebarAlpha] = screen.getAllByText("Alpha");
    const row = sidebarAlpha.closest("div");
    const menuButton = row?.querySelector("button[aria-label='Agent actions']");
    await userEvent.click(menuButton as HTMLElement);
    await userEvent.click(await screen.findByText("Delete"));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/type a message/i)).not.toBeInTheDocument();
    });
  });
});
