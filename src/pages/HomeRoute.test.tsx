import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeRoute } from "@/pages/HomeRoute";

vi.mock("@/lib/native/appExperience", () => ({
  isInstalledAppExperience: vi.fn(),
}));

import { isInstalledAppExperience } from "@/lib/native/appExperience";

const isInstalled = vi.mocked(isInstalledAppExperience);

describe("HomeRoute", () => {
  beforeEach(() => {
    isInstalled.mockReturnValue(false);
  });

  it("shows marketing on / for regular browsers", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={<div>Loading landing</div>}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/today" element={<div>Today app</div>} />
          </Routes>
        </Suspense>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: /Care for every animal/i })).toBeInTheDocument();
  });

  it("sends Capacitor / installed PWA shells to /today", async () => {
    isInstalled.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Suspense fallback={<div>Loading landing</div>}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/today" element={<div>Today app</div>} />
          </Routes>
        </Suspense>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Today app")).toBeInTheDocument();
  });
});

describe("marketing static files", () => {
  it("ships a real XML sitemap, not the SPA shell", () => {
    const xml = readFileSync(path.resolve(__dirname, "../../public/sitemap.xml"), "utf8");
    expect(xml.startsWith("<?xml")).toBe(true);
    expect(xml).toContain("<urlset");
    expect(xml).toContain("https://reptilita.com/</loc>");
    expect(xml).toContain("https://reptilita.com/privacy</loc>");
    expect(xml).not.toContain("<div id=\"root\"");
  });

  it("uses a raster Open Graph image instead of favicon.svg", () => {
    const html = readFileSync(path.resolve(__dirname, "../../index.html"), "utf8");
    expect(html).toContain("https://reptilita.com/og-image.png");
    expect(html).toContain("summary_large_image");
    expect(html).not.toContain('property="og:image" content="/favicon.svg"');
  });
});
