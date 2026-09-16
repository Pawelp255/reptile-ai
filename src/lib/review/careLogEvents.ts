import type { EventType } from "@/types";

export const CARE_LOG_SUCCESS_EVENT = "reptilita:care-log-success";

export const QUALIFYING_REVIEW_EVENT_TYPES = ["feeding", "cleaning", "health"] as const;

export type QualifyingReviewEventType = (typeof QUALIFYING_REVIEW_EVENT_TYPES)[number];

export function isQualifyingReviewEventType(eventType: EventType | string): boolean {
  return (QUALIFYING_REVIEW_EVENT_TYPES as readonly string[]).includes(eventType);
}

/** Fired after a user-initiated feed / clean / health (or Today health-check) log. */
export function emitCareLogSuccess(eventType: EventType | "check"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CARE_LOG_SUCCESS_EVENT, { detail: { eventType } }),
  );
}
