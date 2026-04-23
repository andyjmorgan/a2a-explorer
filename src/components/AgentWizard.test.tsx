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

describe("AgentWizard", () => {
  beforeEach(() => {
    useAuthStore.getState().setTokens("test-token", null, 3600);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().logout();
  });

  test("Cancel button invokes the callback", async () => {
    const onCancel = vi.fn();
    render(<AgentWizard onSaved={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  test("filling in required fields + Save POSTs to the create endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        id: "new-id",
        name: "Test",
        baseUrl: "https://agent.example.com",
        authMode: "None",
        hasAuthHeaderValue: false,
        createdAt: "2026-01-01T00:00:00Z",
      }, 201)
    );
    vi.stubGlobal("fetch", fetchMock);

    const onSaved = vi.fn();
    render(<AgentWizard onSaved={onSaved} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText(/my agent/i), "Test");
    await userEvent.type(screen.getByPlaceholderText(/agent\.example\.com/i), "https://agent.example.com");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/agents", expect.objectContaining({ method: "POST" }));
  });

  test("Header auth mode reveals header name + value inputs", async () => {
    render(<AgentWizard onSaved={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /^header$/i }));
    expect(screen.getByPlaceholderText(/x-api-key/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/secret-token/i)).toBeInTheDocument();
  });

  test("Test button fetches the card and shows a success banner", async () => {
    const card = {
      name: "sampled",
      description: "sampled agent",
      version: "1.2.3",
      defaultInputModes: [],
      defaultOutputModes: [],
      skills: [],
    };
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(card));
    vi.stubGlobal("fetch", fetchMock);

    render(<AgentWizard onSaved={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/agent\.example\.com/i), "https://agent.example.com");
    await userEvent.click(screen.getByRole("button", { name: /^test$/i }));

    await waitFor(() => {
      expect(screen.getByText("sampled")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/agents/test-connection", expect.objectContaining({ method: "POST" }));
  });

  test("Save failure shows an inline error banner", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("duplicate name", { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AgentWizard onSaved={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/my agent/i), "Test");
    await userEvent.type(screen.getByPlaceholderText(/agent\.example\.com/i), "https://agent.example.com");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(screen.getByText(/409/)).toBeInTheDocument();
    });
  });
});
