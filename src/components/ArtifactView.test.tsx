import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArtifactView } from "./ArtifactView";
import type { Artifact } from "@/types/a2a";

function artifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    artifactId: "a1",
    name: "report.txt",
    parts: [],
    ...overrides,
  };
}

describe("ArtifactView", () => {
  test("renders the artifact name and description when present", () => {
    render(
      <ArtifactView
        artifact={artifact({ name: "report.txt", description: "the daily report", parts: [] })}
      />
    );
    expect(screen.getByText("report.txt")).toBeInTheDocument();
    expect(screen.getByText(/the daily report/)).toBeInTheDocument();
  });

  test("falls back to 'Artifact' when no name is set", () => {
    render(<ArtifactView artifact={artifact({ name: undefined, parts: [] })} />);
    expect(screen.getByText("Artifact")).toBeInTheDocument();
  });

  test("renders text parts", () => {
    render(<ArtifactView artifact={artifact({ parts: [{ text: "the body" }] })} />);
    expect(screen.getByText("the body")).toBeInTheDocument();
  });

  test("renders data parts as JSON", () => {
    render(<ArtifactView artifact={artifact({ parts: [{ data: { ok: true } }] })} />);
    expect(
      screen.getByText((_, el) => el?.tagName === "PRE" && /"ok": true/.test(el.textContent ?? ""))
    ).toBeInTheDocument();
  });

  test("renders url parts with filename", () => {
    render(
      <ArtifactView
        artifact={artifact({
          parts: [{ url: "https://example.com/x.csv", filename: "x.csv" }],
        })}
      />
    );
    const link = screen.getByRole("link", { name: "x.csv" });
    expect(link).toHaveAttribute("href", "https://example.com/x.csv");
  });

  test("url parts fall back to 'file' when no filename is set", () => {
    render(
      <ArtifactView artifact={artifact({ parts: [{ url: "https://example.com/x" }] })} />
    );
    expect(screen.getByRole("link", { name: "file" })).toBeInTheDocument();
  });

  test("renders raw parts as inline file label", () => {
    render(
      <ArtifactView
        artifact={artifact({ parts: [{ raw: "ZmFrZQ==", filename: "blob.bin" }] })}
      />
    );
    expect(screen.getByText(/inline file: blob.bin/i)).toBeInTheDocument();
  });

  test("raw parts fall back to 'file' when no filename is set", () => {
    render(<ArtifactView artifact={artifact({ parts: [{ raw: "ZmFrZQ==" }] })} />);
    expect(screen.getByText(/inline file: file/i)).toBeInTheDocument();
  });

  test("renders nothing for empty parts", () => {
    render(<ArtifactView artifact={artifact({ parts: [{}] })} />);
    expect(screen.queryByText(/inline file/i)).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
