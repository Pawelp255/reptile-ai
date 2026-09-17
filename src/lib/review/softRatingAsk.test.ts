import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOFT_RATING_STATE,
  LATER_COOLDOWN_MS,
  MEANINGFUL_USE_MS,
  ensureFirstOpenAt,
  markDeclined,
  markLater,
  markPromptShown,
  markRated,
  parseSoftRatingState,
  shouldShowSoftRatingAsk,
  type SoftRatingState,
} from "./softRatingAsk";

const NOW = 1_700_000_000_000;

function eligible(overrides: Partial<Parameters<typeof shouldShowSoftRatingAsk>[0]> = {}) {
  return shouldShowSoftRatingAsk({
    now: NOW,
    state: DEFAULT_SOFT_RATING_STATE,
    trigger: "care-log",
    platformEligible: true,
    hasMeaningfulUse: true,
    onboardingComplete: true,
    ...overrides,
  });
}

describe("parseSoftRatingState", () => {
  it("returns defaults for empty or invalid storage", () => {
    expect(parseSoftRatingState(null)).toEqual(DEFAULT_SOFT_RATING_STATE);
    expect(parseSoftRatingState("{")).toEqual(DEFAULT_SOFT_RATING_STATE);
    expect(parseSoftRatingState("[]")).toEqual(DEFAULT_SOFT_RATING_STATE);
  });

  it("reads a persisted payload", () => {
    const raw = JSON.stringify({
      version: 1,
      firstOpenAt: 10,
      lastPromptAt: 20,
      status: "later",
      laterUntil: 30,
    });
    expect(parseSoftRatingState(raw)).toMatchObject({
      firstOpenAt: 10,
      status: "later",
      laterUntil: 30,
    });
  });
});

describe("shouldShowSoftRatingAsk", () => {
  it("shows after a qualifying care log on an eligible surface", () => {
    expect(eligible({ trigger: "care-log" })).toBe(true);
  });

  it("does not show on Android / ineligible platforms", () => {
    expect(eligible({ platformEligible: false })).toBe(false);
  });

  it("waits until onboarding is finished", () => {
    expect(eligible({ onboardingComplete: false })).toBe(false);
  });

  it("never shows after a permanent dismiss or a completed rating", () => {
    const declined: SoftRatingState = { ...DEFAULT_SOFT_RATING_STATE, status: "declined" };
    const rated: SoftRatingState = { ...DEFAULT_SOFT_RATING_STATE, status: "rated" };
    expect(eligible({ state: declined })).toBe(false);
    expect(eligible({ state: rated, trigger: "day3" })).toBe(false);
  });

  it("respects the later cooldown, then allows another ask", () => {
    const later = markLater(DEFAULT_SOFT_RATING_STATE, NOW);
    expect(eligible({ state: later, now: NOW + 1000 })).toBe(false);
    expect(eligible({ state: later, now: NOW + LATER_COOLDOWN_MS + 1 })).toBe(true);
  });

  it("does not show a second time if the prompt was already displayed without later", () => {
    const shown = markPromptShown(DEFAULT_SOFT_RATING_STATE, NOW);
    expect(eligible({ state: shown, now: NOW + MEANINGFUL_USE_MS * 2 })).toBe(false);
  });

  it("shows on day 3 of meaningful use, not before", () => {
    const opened = ensureFirstOpenAt(DEFAULT_SOFT_RATING_STATE, NOW);
    expect(
      eligible({
        state: opened,
        trigger: "day3",
        now: NOW + MEANINGFUL_USE_MS - 1,
      }),
    ).toBe(false);
    expect(
      eligible({
        state: opened,
        trigger: "day3",
        now: NOW + MEANINGFUL_USE_MS,
      }),
    ).toBe(true);
    expect(
      eligible({
        state: opened,
        trigger: "day3",
        now: NOW + MEANINGFUL_USE_MS,
        hasMeaningfulUse: false,
      }),
    ).toBe(false);
  });
});
