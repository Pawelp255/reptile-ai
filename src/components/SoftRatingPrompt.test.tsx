import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SoftRatingPrompt } from "@/components/SoftRatingPrompt";
import { ONBOARDING_STORAGE_KEY } from "@/components/OnboardingModal";
import { CARE_LOG_SUCCESS_EVENT } from "@/lib/review/careLogEvents";
import { SOFT_RATING_STORAGE_KEY } from "@/lib/review/softRatingAsk";
import { APP_STORE_REVIEW_URL } from "@/lib/appStore";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => "web",
  },
}));

vi.mock("@/lib/native/appExperience", () => ({
  isIosRatingSurface: () => true,
  isInstalledAppExperience: () => false,
}));

vi.mock("@/lib/storage/reptiles", () => ({
  getAllReptiles: vi.fn(async () => [{ id: "r1" }]),
}));

vi.mock("@/lib/storage/events", () => ({
  getAllCareEvents: vi.fn(async () => []),
}));

describe("SoftRatingPrompt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("asks for an App Store rating after a successful care log, and Later cools down", async () => {
    render(<SoftRatingPrompt />);

    act(() => {
      window.dispatchEvent(new Event(CARE_LOG_SUCCESS_EVENT));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });

    expect(screen.getByRole("heading", { name: "Enjoying Reptilita?" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(screen.queryByRole("heading", { name: "Enjoying Reptilita?" })).not.toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem(SOFT_RATING_STORAGE_KEY) ?? "{}") as {
      status: string;
    };
    expect(stored.status).toBe("later");
  });

  it("opens the App Store review URL and does not ask again after rating", async () => {
    render(<SoftRatingPrompt />);

    act(() => {
      window.dispatchEvent(new Event(CARE_LOG_SUCCESS_EVENT));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });

    fireEvent.click(screen.getByRole("button", { name: "Rate on the App Store" }));
    expect(window.open).toHaveBeenCalledWith(APP_STORE_REVIEW_URL, "_blank", "noopener,noreferrer");

    act(() => {
      window.dispatchEvent(new Event(CARE_LOG_SUCCESS_EVENT));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    expect(screen.queryByRole("heading", { name: "Enjoying Reptilita?" })).not.toBeInTheDocument();
  });
});
