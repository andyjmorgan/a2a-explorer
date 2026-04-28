import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskHandleBubble } from "./TaskHandleBubble";
import type { Task, TaskState } from "@/types/a2a";

const NON_TERMINAL: TaskState[] = ["submitted", "working"];
const TERMINAL: TaskState[] = ["completed", "failed", "canceled", "rejected"];

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1234567890",
    contextId: "ctx-abcdefghij",
    status: { state: "working" },
    ...overrides,
  };
}

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("TaskHandleBubble", () => {
  test.each(NON_TERMINAL)("renders status badge for non-terminal state %s", (state) => {
    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status={state}
        lastCheckedAt={Date.now()}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(state)).toBeInTheDocument();
  });

  test.each(TERMINAL)("renders status badge for terminal state %s", (state) => {
    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status={state}
        lastCheckedAt={Date.now()}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(state)).toBeInTheDocument();
  });

  test("shows truncated taskId and a working CopyButton wired to the full id", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="working"
        lastCheckedAt={Date.now()}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("task-123…")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /copy message/i }));
    expect(writeText).toHaveBeenCalledWith("task-1234567890");
  });

  test("renders the full taskId when it is short enough not to need truncation", () => {
    render(
      <TaskHandleBubble
        taskId="short"
        contextId="ctx"
        status="working"
        lastCheckedAt={Date.now()}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("short")).toBeInTheDocument();
    expect(screen.getByText("ctx ctx")).toBeInTheDocument();
  });

  test("Refresh button is enabled in non-terminal states and fires onRefresh", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="working"
        lastCheckedAt={Date.now()}
        onRefresh={onRefresh}
        onCancel={vi.fn()}
      />,
    );

    const refresh = screen.getByRole("button", { name: /refresh task/i });
    expect(refresh).toBeEnabled();
    await userEvent.click(refresh);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test("Refresh button is still rendered (and enabled) in terminal states", async () => {
    const onRefresh = vi.fn();
    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="completed"
        lastCheckedAt={Date.now()}
        onRefresh={onRefresh}
        onCancel={vi.fn()}
      />,
    );
    const refresh = screen.getByRole("button", { name: /refresh task/i });
    expect(refresh).toBeInTheDocument();
    expect(refresh).toBeEnabled();
  });

  test("Cancel button is visible in non-terminal states and fires onCancel", async () => {
    const onCancel = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="working"
        lastCheckedAt={Date.now()}
        onRefresh={vi.fn()}
        onCancel={onCancel}
      />,
    );

    const cancel = screen.getByRole("button", { name: /cancel task/i });
    expect(cancel).toBeEnabled();
    await userEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test.each(TERMINAL)("Cancel button is hidden in terminal state %s", (state) => {
    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status={state}
        lastCheckedAt={Date.now()}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /cancel task/i })).toBeNull();
  });

  test("'checked Xs ago' hint advances over time and the interval is cleaned up on unmount", () => {
    vi.useFakeTimers();
    const start = 1_700_000_000_000;
    vi.setSystemTime(start);

    const { unmount } = render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="working"
        lastCheckedAt={start}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/checked 0s ago/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText(/checked 3s ago/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.getByText(/checked 10s ago/)).toBeInTheDocument();

    const clearSpy = vi.spyOn(window, "clearInterval");
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });

  test("busy disables both refresh and cancel buttons", () => {
    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="working"
        lastCheckedAt={Date.now()}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
        busy
      />,
    );
    expect(screen.getByRole("button", { name: /refresh task/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel task/i })).toBeDisabled();
  });

  test("renders the status message text from the raw task", () => {
    const raw = makeTask({
      status: {
        state: "working",
        message: {
          messageId: "m1",
          role: "ROLE_AGENT",
          parts: [{ text: "still thinking" }, { data: { progress: 0.4 } }, {}],
        },
      },
    });
    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="working"
        lastCheckedAt={Date.now()}
        raw={raw}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByText((_, el) =>
        el?.textContent === `still thinking\n${JSON.stringify({ progress: 0.4 })}`,
      ),
    ).toBeInTheDocument();
  });

  test("does not render a status message block when raw has no status message", () => {
    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="working"
        lastCheckedAt={Date.now()}
        raw={makeTask({ status: { state: "working" } })}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByText(/still thinking/)).toBeNull();
  });

  test("renders the error banner with text when provided", () => {
    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="working"
        lastCheckedAt={Date.now()}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
        error="upstream exploded"
      />,
    );
    expect(screen.getByText("upstream exploded")).toBeInTheDocument();
  });
});
