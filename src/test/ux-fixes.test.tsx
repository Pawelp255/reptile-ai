import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

function ShowPath() {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

describe("/animals redirect", () => {
  it("is declared as a client redirect to /reptiles", () => {
    const source = readFileSync(path.resolve(__dirname, "../App.tsx"), "utf8");
    expect(source).toMatch(/path="\/animals"\s+element=\{<Navigate to="\/reptiles" replace \/>\}/);
  });

  it("sends /animals to /reptiles", () => {
    render(
      <MemoryRouter initialEntries={["/animals"]}>
        <Routes>
          <Route path="/animals" element={<Navigate to="/reptiles" replace />} />
          <Route path="/reptiles" element={<ShowPath />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("path")).toHaveTextContent("/reptiles");
  });
});

describe("animal empty-state icons", () => {
  it("uses PawPrint on /reptiles and /add-event instead of Bug", () => {
    const reptiles = readFileSync(path.resolve(__dirname, "../pages/ReptilesPage.tsx"), "utf8");
    const addEvent = readFileSync(path.resolve(__dirname, "../pages/AddEventPage.tsx"), "utf8");

    expect(reptiles).toMatch(/icon=\{<PawPrint /);
    expect(addEvent).toMatch(/icon=\{<PawPrint /);
    expect(reptiles).not.toMatch(/\bBug\b/);
    expect(addEvent).not.toMatch(/\bBug\b/);
  });
});
