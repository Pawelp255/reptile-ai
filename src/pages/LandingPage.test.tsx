import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import LandingPage from "@/pages/LandingPage";
import { APP_STORE_URL } from "@/lib/appStore";

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe("marketing landing page", () => {
  it("sells the iOS app with an official App Store badge and does not claim Play is live", () => {
    renderLanding();

    const badges = screen.getAllByRole("link", { name: "Download on the App Store" });
    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) {
      expect(badge).toHaveAttribute("href", APP_STORE_URL);
    }

    expect(screen.getAllByText(/Coming soon on Google Play/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Join Android testing/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /google play/i })).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("play.google.com");
  });

  it("keeps the web app reachable and links privacy, terms, and support", () => {
    renderLanding();

    expect(screen.getByRole("button", { name: "Open web app" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Privacy" }).some((el) => el.getAttribute("href") === "/privacy")).toBe(true);
    expect(screen.getAllByRole("link", { name: "Terms" }).some((el) => el.getAttribute("href") === "/terms")).toBe(true);
    expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:support@reptilita.com"),
    );
  });
});
