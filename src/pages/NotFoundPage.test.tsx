import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NotFoundPage } from "./NotFoundPage";

describe("NotFoundPage", () => {
  test("renders the 404 message", () => {
    render(
      <MemoryRouter initialEntries={["/nowhere"]}>
        <Routes>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go home/i })).toBeInTheDocument();
  });

  test("Go home button navigates to /", async () => {
    render(
      <MemoryRouter initialEntries={["/nowhere"]}>
        <Routes>
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole("button", { name: /go home/i }));
    expect(screen.getByText("home")).toBeInTheDocument();
  });
});
