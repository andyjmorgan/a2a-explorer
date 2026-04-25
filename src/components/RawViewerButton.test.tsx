import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RawViewerButton } from "./RawViewerButton";

vi.mock("@/components/ui/json-viewer", () => ({
  JsonViewer: ({ data }: { data: unknown }) => (
    <pre data-testid="json-stub">{JSON.stringify(data)}</pre>
  ),
}));

describe("RawViewerButton", () => {
  test("renders nothing when neither request nor response is set", () => {
    const { container } = render(<RawViewerButton raw={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("opens the dialog with response selected by default when both are present", async () => {
    render(
      <RawViewerButton
        raw={{ request: { hello: "world" }, response: { agent: "reply" } }}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /view raw json/i }));

    // Both tab buttons rendered.
    expect(screen.getByRole("tab", { name: /request/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /response/i })).toBeInTheDocument();
    // Response is the active default.
    const stubs = screen.getAllByTestId("json-stub");
    expect(stubs.some((el) => el.textContent?.includes('"agent":"reply"'))).toBe(true);
  });

  test("falls back to request tab when only request is present", async () => {
    render(<RawViewerButton raw={{ request: { only: "request" } }} />);
    await userEvent.click(screen.getByRole("button", { name: /view raw json/i }));

    expect(screen.queryByRole("tab", { name: /response/i })).toBeNull();
    expect(screen.getByTestId("json-stub").textContent).toContain('"only":"request"');
  });
});
