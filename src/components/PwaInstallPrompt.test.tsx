import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => "web",
  },
}));

function fireInstallPrompt() {
  const event = new Event("beforeinstallprompt");
  Object.assign(event, {
    prompt: vi.fn(async () => undefined),
    userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
}

describe("PwaInstallPrompt", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.removeProperty("--pwa-install-offset");
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 400,
      height: 88,
      top: 12,
      left: 16,
      bottom: 100,
      right: 416,
      x: 16,
      y: 12,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty("--pwa-install-offset");
  });

  it("reserves top layout space instead of covering bottom CTAs", () => {
    render(<PwaInstallPrompt />);
    fireInstallPrompt();

    const banner = screen.getByRole("dialog", { name: "Install Reptilita" });
    expect(banner).toHaveAttribute("data-pwa-install-banner");
    expect(banner.className).toContain("fixed");
    expect(banner.className).toContain("top-[max(0.75rem,env(safe-area-inset-top,0px))]");
    expect(banner.className).not.toMatch(/bottom-/);
    expect(document.documentElement.style.getPropertyValue("--pwa-install-offset")).toBe("100px");
  });

  it("stays dismissible and clears the layout offset", () => {
    render(<PwaInstallPrompt />);
    fireInstallPrompt();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss install prompt" }));

    expect(screen.queryByRole("dialog", { name: "Install Reptilita" })).not.toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue("--pwa-install-offset")).toBe("");
    expect(window.localStorage.getItem("reptilita:pwa-install-dismissed-at")).toBeTruthy();
  });
});
