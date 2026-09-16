export const SOFT_RATING_STORAGE_KEY = "reptilita:soft-rating-ask";

export const LATER_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
export const MEANINGFUL_USE_MS = 3 * 24 * 60 * 60 * 1000;

export type SoftRatingStatus = "unprompted" | "later" | "declined" | "rated";

export type SoftRatingState = {
  version: 1;
  firstOpenAt: number | null;
  lastPromptAt: number | null;
  status: SoftRatingStatus;
  laterUntil: number | null;
};

export const DEFAULT_SOFT_RATING_STATE: SoftRatingState = {
  version: 1,
  firstOpenAt: null,
  lastPromptAt: null,
  status: "unprompted",
  laterUntil: null,
};

export type SoftRatingTrigger = "care-log" | "day3";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseSoftRatingState(raw: string | null): SoftRatingState {
  if (!raw) return { ...DEFAULT_SOFT_RATING_STATE };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...DEFAULT_SOFT_RATING_STATE };
    const status = parsed.status;
    const validStatus: SoftRatingStatus[] = ["unprompted", "later", "declined", "rated"];
    return {
      version: 1,
      firstOpenAt: typeof parsed.firstOpenAt === "number" ? parsed.firstOpenAt : null,
      lastPromptAt: typeof parsed.lastPromptAt === "number" ? parsed.lastPromptAt : null,
      status: validStatus.includes(status as SoftRatingStatus)
        ? (status as SoftRatingStatus)
        : "unprompted",
      laterUntil: typeof parsed.laterUntil === "number" ? parsed.laterUntil : null,
    };
  } catch {
    return { ...DEFAULT_SOFT_RATING_STATE };
  }
}

export function readSoftRatingState(): SoftRatingState {
  if (typeof window === "undefined") return { ...DEFAULT_SOFT_RATING_STATE };
  return parseSoftRatingState(window.localStorage.getItem(SOFT_RATING_STORAGE_KEY));
}

export function writeSoftRatingState(state: SoftRatingState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOFT_RATING_STORAGE_KEY, JSON.stringify(state));
}

export function ensureFirstOpenAt(state: SoftRatingState, now: number): SoftRatingState {
  if (state.firstOpenAt != null) return state;
  return { ...state, firstOpenAt: now };
}

export function markPromptShown(state: SoftRatingState, now: number): SoftRatingState {
  return { ...state, lastPromptAt: now };
}

export function markLater(state: SoftRatingState, now: number, cooldownMs = LATER_COOLDOWN_MS): SoftRatingState {
  return {
    ...state,
    status: "later",
    lastPromptAt: now,
    laterUntil: now + cooldownMs,
  };
}

export function markDeclined(state: SoftRatingState, now: number): SoftRatingState {
  return { ...state, status: "declined", lastPromptAt: now };
}

export function markRated(state: SoftRatingState, now: number): SoftRatingState {
  return { ...state, status: "rated", lastPromptAt: now };
}

/**
 * Whether the polite rating prompt may appear.
 * Never spam: one showing unless the user chose "later" (then cooldown).
 */
export function shouldShowSoftRatingAsk(params: {
  now: number;
  state: SoftRatingState;
  trigger: SoftRatingTrigger;
  platformEligible: boolean;
  hasMeaningfulUse: boolean;
  onboardingComplete: boolean;
}): boolean {
  const { now, state, trigger, platformEligible, hasMeaningfulUse, onboardingComplete } = params;
  if (!platformEligible || !onboardingComplete) return false;
  if (state.status === "declined" || state.status === "rated") return false;

  if (state.status === "later") {
    if (state.laterUntil != null && now < state.laterUntil) return false;
  } else if (state.lastPromptAt != null) {
    // Shown once already without an explicit "later" — do not ask again.
    return false;
  }

  if (trigger === "care-log") {
    return true;
  }

  if (trigger === "day3") {
    if (!hasMeaningfulUse) return false;
    if (state.firstOpenAt == null) return false;
    return now - state.firstOpenAt >= MEANINGFUL_USE_MS;
  }

  return false;
}
