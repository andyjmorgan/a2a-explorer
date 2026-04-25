import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "@/types/a2a";

function message(parts: Message["parts"], role: Message["role"] = "ROLE_USER"): Message {
  return { messageId: "m1", role, parts };
}

describe("MessageBubble", () => {
  test("renders text parts as paragraphs", () => {
    render(<MessageBubble message={message([{ text: "hello world" }])} />);
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  test("renders data parts as pretty-printed JSON", () => {
    render(<MessageBubble message={message([{ data: { foo: "bar", n: 42 } }])} />);
    const pre = screen.getByText((_, el) => el?.tagName === "PRE" && /"foo": "bar"/.test(el.textContent ?? ""));
    expect(pre).toBeInTheDocument();
  });

  test("renders url parts as anchor tags using filename when present", () => {
    render(
      <MessageBubble
        message={message([{ url: "https://example.com/file.pdf", filename: "report.pdf" }])}
      />
    );
    const link = screen.getByRole("link", { name: "report.pdf" });
    expect(link).toHaveAttribute("href", "https://example.com/file.pdf");
    expect(link).toHaveAttribute("target", "_blank");
  });

  test("url parts fall back to 'file' when no filename is set", () => {
    render(<MessageBubble message={message([{ url: "https://example.com/x" }])} />);
    expect(screen.getByRole("link", { name: "file" })).toBeInTheDocument();
  });

  test("renders raw parts as inline file label", () => {
    render(<MessageBubble message={message([{ raw: "ZmFrZQ==", filename: "blob.bin" }])} />);
    expect(screen.getByText(/inline file: blob.bin/i)).toBeInTheDocument();
  });

  test("raw parts fall back to 'file' when no filename is set", () => {
    render(<MessageBubble message={message([{ raw: "ZmFrZQ==" }])} />);
    expect(screen.getByText(/inline file: file/i)).toBeInTheDocument();
  });

  test("renders nothing for empty parts", () => {
    const { container } = render(<MessageBubble message={message([{}])} />);
    expect(container.querySelector("p, pre, a, span")).toBeNull();
  });

  test("agent role renders as plain prose without a bubble container", () => {
    const { container } = render(
      <MessageBubble message={message([{ text: "hi" }], "ROLE_AGENT")} />
    );
    // Agent messages have no gradient bubble, no right-justification.
    expect(container.querySelector(".justify-end")).toBeNull();
    expect(container.querySelector(".bg-gradient-to-r")).toBeNull();
  });

  test("user role renders a right-aligned gradient bubble", () => {
    const { container } = render(
      <MessageBubble message={message([{ text: "hi" }], "ROLE_USER")} />
    );
    expect(container.querySelector(".justify-end")).not.toBeNull();
    expect(container.querySelector(".bg-gradient-to-r")).not.toBeNull();
  });
});
