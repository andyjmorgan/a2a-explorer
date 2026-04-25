import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "./ChatPanel";
import type { SendMessageResponseBody } from "@/lib/api";
import { ApiError, a2aApi } from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    a2aApi: {
      ...actual.a2aApi,
      sendMessage: vi.fn(),
    },
  };
});

const sendMessage = a2aApi.sendMessage as ReturnType<typeof vi.fn>;

beforeEach(() => {
  sendMessage.mockReset();
  // happy-dom usually provides crypto.randomUUID; if it doesn't, bolt one on so the component
  // can construct user message ids without crashing.
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    Object.defineProperty(globalThis, "crypto", {
      value: { ...globalThis.crypto, randomUUID: () => "test-uuid" },
      configurable: true,
    });
  }
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ChatPanel", () => {
  test("renders empty-state placeholder", () => {
    render(<ChatPanel agentId="a1" />);
    expect(screen.getByText(/say hi to your agent/i)).toBeInTheDocument();
  });

  test("send button is disabled until the user types", () => {
    render(<ChatPanel agentId="a1" />);
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  test("sending a message renders the user bubble and the agent task response", async () => {
    const response: SendMessageResponseBody = {
      task: {
        id: "t1",
        contextId: "c1",
        status: {
          state: "completed",
          message: {
            messageId: "agent-1",
            role: "ROLE_AGENT",
            parts: [{ text: "hello back" }],
          },
        },
        artifacts: [
          { artifactId: "art-1", name: "summary.txt", parts: [{ text: "the summary" }] },
        ],
      },
    };
    sendMessage.mockResolvedValueOnce(response);

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/type a message/i), "hi there");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(screen.getByText("hi there")).toBeInTheDocument();
    expect(screen.getByText("hello back")).toBeInTheDocument();
    expect(screen.getByText("summary.txt")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();

    const callArgs = sendMessage.mock.calls[0];
    expect(callArgs[0]).toBe("a1");
    expect(callArgs[1].message.role).toBe("ROLE_USER");
    expect(callArgs[1].configuration).toEqual({ blocking: true });
  });

  test("a message-only response is appended without task state", async () => {
    sendMessage.mockResolvedValueOnce({
      message: {
        messageId: "agent-direct",
        role: "ROLE_AGENT",
        parts: [{ text: "direct reply" }],
      },
    });

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/type a message/i), "ping");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("direct reply")).toBeInTheDocument());
    // No task state badge
    expect(screen.queryByText("completed")).toBeNull();
    expect(screen.queryByText("working")).toBeNull();
  });

  test("ApiError surfaces as the inline banner with status prefix", async () => {
    sendMessage.mockRejectedValueOnce(new ApiError(502, "upstream down"));

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/type a message/i), "boom");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText(/502: upstream down/)).toBeInTheDocument());
  });

  test("a generic Error surfaces its message", async () => {
    sendMessage.mockRejectedValueOnce(new Error("network blew up"));

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/type a message/i), "boom");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText(/network blew up/)).toBeInTheDocument());
  });

  test("Enter sends, Shift+Enter does not", async () => {
    sendMessage.mockResolvedValueOnce({
      message: {
        messageId: "agent-enter",
        role: "ROLE_AGENT",
        parts: [{ text: "got it" }],
      },
    });

    render(<ChatPanel agentId="a1" />);
    const textarea = screen.getByPlaceholderText(/type a message/i);

    // Shift+Enter inserts a newline rather than submitting.
    await userEvent.type(textarea, "first line{Shift>}{Enter}{/Shift}second line");
    expect(sendMessage).not.toHaveBeenCalled();

    // Plain Enter submits.
    await userEvent.type(textarea, "{Enter}");
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
  });

  test("changing agentId resets entries and task state", async () => {
    sendMessage.mockResolvedValueOnce({
      message: {
        messageId: "agent-x",
        role: "ROLE_AGENT",
        parts: [{ text: "first agent reply" }],
      },
    });

    const { rerender } = render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/type a message/i), "hi");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() =>
      expect(screen.getByText("first agent reply")).toBeInTheDocument()
    );

    rerender(<ChatPanel agentId="a2" />);
    expect(screen.queryByText("first agent reply")).toBeNull();
    expect(screen.getByText(/say hi to your agent/i)).toBeInTheDocument();
  });
});
