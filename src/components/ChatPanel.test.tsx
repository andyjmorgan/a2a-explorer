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
      getTask: vi.fn(),
      cancelTask: vi.fn(),
    },
  };
});

const sendMessage = a2aApi.sendMessage as ReturnType<typeof vi.fn>;
const getTask = a2aApi.getTask as ReturnType<typeof vi.fn>;
const cancelTask = a2aApi.cancelTask as ReturnType<typeof vi.fn>;

beforeEach(() => {
  sendMessage.mockReset();
  getTask.mockReset();
  cancelTask.mockReset();
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
          state: "TASK_STATE_COMPLETED",
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
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "hi there");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(screen.getByText("hi there")).toBeInTheDocument();
    expect(screen.getByText("hello back")).toBeInTheDocument();
    expect(screen.getByText("summary.txt")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();

    const callArgs = sendMessage.mock.calls[0];
    expect(callArgs[0]).toBe("a1");
    expect(callArgs[1].message.role).toBe("ROLE_USER");
    expect(callArgs[1].configuration).toEqual({ returnImmediately: false });
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
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "ping");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("direct reply")).toBeInTheDocument());
    // No task state badge
    expect(screen.queryByText("completed")).toBeNull();
    expect(screen.queryByText("working")).toBeNull();
  });

  test("ApiError surfaces as the inline banner with status prefix", async () => {
    sendMessage.mockRejectedValueOnce(new ApiError(502, "upstream down"));

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "boom");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText(/502: upstream down/)).toBeInTheDocument());
  });

  test("a generic Error surfaces its message", async () => {
    sendMessage.mockRejectedValueOnce(new Error("network blew up"));

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "boom");
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
    const textarea = screen.getByPlaceholderText(/send a message/i);

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
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "hi");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() =>
      expect(screen.getByText("first agent reply")).toBeInTheDocument()
    );

    rerender(<ChatPanel agentId="a2" />);
    expect(screen.queryByText("first agent reply")).toBeNull();
    expect(screen.getByText(/say hi to your agent/i)).toBeInTheDocument();
  });

  test("non-terminal task response renders a TaskHandleBubble", async () => {
    sendMessage.mockResolvedValueOnce({
      task: {
        id: "task-running-001",
        contextId: "ctx-running-001",
        status: { state: "TASK_STATE_WORKING" },
      },
    });

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "kick it off");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByRole("button", { name: /refresh task/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel task/i })).toBeInTheDocument();
    // The TaskHandleBubble itself surfaces the working state badge.
    expect(screen.getAllByText("working").length).toBeGreaterThan(0);
  });

  test("Refresh on a completed task keeps the bubble and appends status message + artifact entries", async () => {
    sendMessage.mockResolvedValueOnce({
      task: {
        id: "task-running-002",
        contextId: "ctx-002",
        status: { state: "TASK_STATE_WORKING" },
      },
    });
    getTask.mockResolvedValueOnce({
      id: "task-running-002",
      contextId: "ctx-002",
      status: {
        state: "TASK_STATE_COMPLETED",
        message: {
          messageId: "agent-final",
          role: "ROLE_AGENT",
          parts: [{ text: "all done" }],
        },
      },
      artifacts: [
        { artifactId: "art-1", name: "summary.txt", parts: [{ text: "the summary" }] },
      ],
    });

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "go");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    const refresh = await screen.findByRole("button", { name: /refresh task/i });
    await userEvent.click(refresh);

    await waitFor(() => expect(getTask).toHaveBeenCalledWith("a1", "task-running-002"));
    // Bubble persists post-completion (so the user can still see/copy task ids).
    expect(screen.getByRole("button", { name: /refresh task/i })).toBeInTheDocument();
    // Cancel disappears once terminal.
    expect(screen.queryByRole("button", { name: /cancel task/i })).toBeNull();
    // Result + artifact appended.
    expect(screen.getByText("all done")).toBeInTheDocument();
    expect(screen.getByText("the summary")).toBeInTheDocument();
    // Bubble badge reflects completed.
    expect(screen.getAllByText("completed").length).toBeGreaterThan(0);
  });

  test("Re-refreshing a completed task does not duplicate the appended message", async () => {
    sendMessage.mockResolvedValueOnce({
      task: {
        id: "task-running-007",
        contextId: "ctx-007",
        status: { state: "TASK_STATE_WORKING" },
      },
    });
    const completed = {
      id: "task-running-007",
      contextId: "ctx-007",
      status: {
        state: "TASK_STATE_COMPLETED" as const,
        message: {
          messageId: "agent-once",
          role: "ROLE_AGENT" as const,
          parts: [{ text: "exactly once" }],
        },
      },
    };
    getTask.mockResolvedValueOnce(completed).mockResolvedValueOnce(completed);

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "go");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    const refresh = await screen.findByRole("button", { name: /refresh task/i });
    await userEvent.click(refresh);
    await waitFor(() => expect(screen.getByText("exactly once")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /refresh task/i }));
    await waitFor(() => expect(getTask).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText("exactly once")).toHaveLength(1);
  });

  test("Refresh on a failed task keeps the bubble and surfaces the failure status message", async () => {
    sendMessage.mockResolvedValueOnce({
      task: {
        id: "task-running-003",
        contextId: "ctx-003",
        status: { state: "TASK_STATE_WORKING" },
      },
    });
    getTask.mockResolvedValueOnce({
      id: "task-running-003",
      contextId: "ctx-003",
      status: {
        state: "TASK_STATE_FAILED",
        message: {
          messageId: "agent-fail",
          role: "ROLE_AGENT",
          parts: [{ text: "boom" }],
        },
      },
    });

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "fail me");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    const refresh = await screen.findByRole("button", { name: /refresh task/i });
    await userEvent.click(refresh);

    await waitFor(() => expect(getTask).toHaveBeenCalledWith("a1", "task-running-003"));
    // Bubble is still around (refresh button still rendered) and shows the failed badge + message.
    expect(screen.getByRole("button", { name: /refresh task/i })).toBeInTheDocument();
    // 'failed' appears both inside the bubble badge and the bottom task-state chip.
    expect(screen.getAllByText("failed").length).toBeGreaterThan(0);
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  test("Refresh failure surfaces the error inside the bubble without removing it", async () => {
    sendMessage.mockResolvedValueOnce({
      task: {
        id: "task-running-005",
        contextId: "ctx-005",
        status: { state: "TASK_STATE_WORKING" },
      },
    });
    getTask.mockRejectedValueOnce(new ApiError(503, "no good"));

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "go");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    const refresh = await screen.findByRole("button", { name: /refresh task/i });
    await userEvent.click(refresh);

    await waitFor(() => expect(screen.getByText(/503: no good/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /refresh task/i })).toBeInTheDocument();
  });

  test("Cancel calls cancelTask with the right args and updates the bubble status", async () => {
    sendMessage.mockResolvedValueOnce({
      task: {
        id: "task-running-004",
        contextId: "ctx-004",
        status: { state: "TASK_STATE_WORKING" },
      },
    });
    cancelTask.mockResolvedValueOnce({
      id: "task-running-004",
      contextId: "ctx-004",
      status: { state: "TASK_STATE_CANCELED" },
    });

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "stop");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    const cancel = await screen.findByRole("button", { name: /cancel task/i });
    await userEvent.click(cancel);

    await waitFor(() => expect(cancelTask).toHaveBeenCalledWith("a1", "task-running-004"));
    // Cancel button should now be hidden (terminal state).
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /cancel task/i })).toBeNull(),
    );
    expect(screen.getAllByText("canceled").length).toBeGreaterThan(0);
  });

  test("Refresh on a completed task with null status.message falls back to history's last agent message", async () => {
    sendMessage.mockResolvedValueOnce({
      task: {
        id: "task-running-006",
        contextId: "ctx-006",
        status: { state: "TASK_STATE_WORKING" },
      },
    });
    // Mirror the real shape: status.message is null, the result lives in history (and is also
    // duplicated as a text-only artifact, which we should dedupe to avoid double-rendering).
    getTask.mockResolvedValueOnce({
      id: "task-running-006",
      contextId: "ctx-006",
      status: { state: "TASK_STATE_COMPLETED", message: null },
      history: [
        {
          messageId: "agent-final",
          role: "ROLE_AGENT",
          parts: [{ text: "90 seconds have passed!" }],
        },
      ],
      artifacts: [
        {
          artifactId: "art-dupe",
          parts: [{ text: "90 seconds have passed!" }],
        },
      ],
    });

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "wait");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    const refresh = await screen.findByRole("button", { name: /refresh task/i });
    await userEvent.click(refresh);

    await waitFor(() => expect(getTask).toHaveBeenCalledWith("a1", "task-running-006"));
    // Bubble persists; result text rendered exactly once (history fallback used, duplicate artifact deduped).
    expect(screen.getByRole("button", { name: /refresh task/i })).toBeInTheDocument();
    expect(screen.getAllByText("90 seconds have passed!")).toHaveLength(1);
  });

  test("Completed task badge in the footer renders the friendly state label, not the raw enum", async () => {
    sendMessage.mockResolvedValueOnce({
      task: {
        id: "t-friendly",
        contextId: "c-friendly",
        status: {
          state: "TASK_STATE_COMPLETED",
          message: {
            messageId: "agent-friendly",
            role: "ROLE_AGENT",
            parts: [{ text: "ok" }],
          },
        },
      },
    });

    render(<ChatPanel agentId="a1" />);
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "go");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("ok")).toBeInTheDocument());
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.queryByText("TASK_STATE_COMPLETED")).toBeNull();
  });

  test("toggling 'Run as task' sends configuration.returnImmediately=true on the next message", async () => {
    sendMessage.mockResolvedValueOnce({
      message: {
        messageId: "agent-r",
        role: "ROLE_AGENT",
        parts: [{ text: "ok" }],
      },
    });

    render(<ChatPanel agentId="a1" />);
    await userEvent.click(screen.getByRole("switch", { name: /run as task/i }));
    await userEvent.type(screen.getByPlaceholderText(/send a message/i), "go");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(sendMessage.mock.calls[0][1].configuration).toEqual({ returnImmediately: true });
  });
});
