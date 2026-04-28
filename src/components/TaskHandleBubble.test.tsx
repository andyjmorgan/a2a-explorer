import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskHandleBubble } from "./TaskHandleBubble";
import type { Task, TaskState } from "@/types/a2a";

const NON_TERMINAL: TaskState[] = ["TASK_STATE_SUBMITTED", "TASK_STATE_WORKING"];
const TERMINAL: TaskState[] = [
  "TASK_STATE_COMPLETED",
  "TASK_STATE_FAILED",
  "TASK_STATE_CANCELED",
  "TASK_STATE_REJECTED",
];

function friendly(state: TaskState): string {
  return state.replace(/^TASK_STATE_/, "").replace(/_/g, "-").toLowerCase();
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1234567890",
    contextId: "ctx-abcdefghij",
    status: { state: "TASK_STATE_WORKING" },
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
    expect(screen.getByText(friendly(state))).toBeInTheDocument();
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
    expect(screen.getByText(friendly(state))).toBeInTheDocument();
  });

  test("renders both ids in full and copy buttons that write each id to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="TASK_STATE_WORKING"
        lastCheckedAt={Date.now()}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("task-1234567890")).toBeInTheDocument();
    expect(screen.getByText("ctx-abcdefghij")).toBeInTheDocument();

    const copies = screen.getAllByRole("button", { name: /copy message/i });
    expect(copies).toHaveLength(2);
    await userEvent.click(copies[0]);
    expect(writeText).toHaveBeenLastCalledWith("task-1234567890");
    await userEvent.click(copies[1]);
    expect(writeText).toHaveBeenLastCalledWith("ctx-abcdefghij");
  });

  test("Refresh button is enabled in non-terminal states and fires onRefresh", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="TASK_STATE_WORKING"
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
        status="TASK_STATE_COMPLETED"
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
        status="TASK_STATE_WORKING"
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
        status="TASK_STATE_WORKING"
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
        status="TASK_STATE_WORKING"
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
        state: "TASK_STATE_WORKING",
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
        status="TASK_STATE_WORKING"
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
        status="TASK_STATE_WORKING"
        lastCheckedAt={Date.now()}
        raw={makeTask({ status: { state: "TASK_STATE_WORKING" } })}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByText(/still thinking/)).toBeNull();
  });

  test("Auto 10s toggle is off by default and only renders in non-terminal states", () => {
    const { rerender } = render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="TASK_STATE_WORKING"
        lastCheckedAt={Date.now()}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const toggle = screen.getByRole("switch", { name: /auto-refresh every 10 seconds/i });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    rerender(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="TASK_STATE_COMPLETED"
        lastCheckedAt={Date.now()}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("switch", { name: /auto-refresh every 10 seconds/i })).toBeNull();
  });

  test("toggling Auto 10s on calls onRefresh on each 10s interval and stops when toggled off", () => {
    vi.useFakeTimers();
    const onRefresh = vi.fn();
    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="TASK_STATE_WORKING"
        lastCheckedAt={Date.now()}
        onRefresh={onRefresh}
        onCancel={vi.fn()}
      />,
    );

    const toggle = screen.getByRole("switch", { name: /auto-refresh every 10 seconds/i });
    act(() => { fireEvent.click(toggle); });

    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onRefresh).toHaveBeenCalledTimes(2);

    act(() => { fireEvent.click(toggle); });
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  test("renders the error banner with text when provided", () => {
    render(
      <TaskHandleBubble
        taskId="task-1234567890"
        contextId="ctx-abcdefghij"
        status="TASK_STATE_WORKING"
        lastCheckedAt={Date.now()}
        onRefresh={vi.fn()}
        onCancel={vi.fn()}
        error="upstream exploded"
      />,
    );
    expect(screen.getByText("upstream exploded")).toBeInTheDocument();
  });
});
