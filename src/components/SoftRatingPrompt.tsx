import { useCallback, useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { openAppStoreReview } from "@/lib/appStore";
import { isIosRatingSurface } from "@/lib/native/appExperience";
import { getAllCareEvents } from "@/lib/storage/events";
import { getAllReptiles } from "@/lib/storage/reptiles";
import { CARE_LOG_SUCCESS_EVENT } from "@/lib/review/careLogEvents";
import { ONBOARDING_STORAGE_KEY } from "@/components/OnboardingModal";
import {
  ensureFirstOpenAt,
  markDeclined,
  markLater,
  markPromptShown,
  markRated,
  readSoftRatingState,
  shouldShowSoftRatingAsk,
  writeSoftRatingState,
  type SoftRatingState,
  type SoftRatingTrigger,
} from "@/lib/review/softRatingAsk";

const CARE_LOG_PROMPT_DELAY_MS = 1200;

async function hasMeaningfulUse(): Promise<boolean> {
  const [reptiles, events] = await Promise.all([getAllReptiles(), getAllCareEvents()]);
  return reptiles.length > 0 || events.length > 0;
}

function isOnboardingComplete(): boolean {
  return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

export function SoftRatingPrompt() {
  const [open, setOpen] = useState(false);
  const stateRef = useRef<SoftRatingState>(readSoftRatingState());
  const persist = useCallback((next: SoftRatingState) => {
    stateRef.current = next;
    writeSoftRatingState(next);
  }, []);

  useEffect(() => {
    persist(ensureFirstOpenAt(stateRef.current, Date.now()));
  }, [persist]);

  const tryShow = useCallback(
    async (trigger: SoftRatingTrigger) => {
      if (open) return;
      if (!isIosRatingSurface()) return;
      const meaningful = await hasMeaningfulUse();
      const now = Date.now();
      const allowed = shouldShowSoftRatingAsk({
        now,
        state: stateRef.current,
        trigger,
        platformEligible: true,
        hasMeaningfulUse: meaningful,
        onboardingComplete: isOnboardingComplete(),
      });
      if (!allowed) return;
      persist(markPromptShown(stateRef.current, now));
      setOpen(true);
    },
    [open, persist],
  );

  useEffect(() => {
    const onCareLog = () => {
      window.setTimeout(() => {
        void tryShow("care-log");
      }, CARE_LOG_PROMPT_DELAY_MS);
    };
    window.addEventListener(CARE_LOG_SUCCESS_EVENT, onCareLog);

    const checkDay3 = () => {
      void tryShow("day3");
    };
    checkDay3();
    document.addEventListener("visibilitychange", checkDay3);

    return () => {
      window.removeEventListener(CARE_LOG_SUCCESS_EVENT, onCareLog);
      document.removeEventListener("visibilitychange", checkDay3);
    };
  }, [tryShow]);

  const closeAsLater = () => {
    persist(markLater(stateRef.current, Date.now()));
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        setOpen(false);
        const status = stateRef.current.status;
        if (status === "rated" || status === "declined") return;
        persist(markLater(stateRef.current, Date.now()));
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Star className="h-5 w-5" aria-hidden />
          </div>
          <DialogTitle>Enjoying Reptilita?</DialogTitle>
          <DialogDescription>
            If logging care is helping you stay on schedule, a short App Store rating takes a moment and helps other
            keepers find the app.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
          <Button
            className="w-full rounded-full"
            onClick={() => {
              persist(markRated(stateRef.current, Date.now()));
              setOpen(false);
              openAppStoreReview();
            }}
          >
            Rate on the App Store
          </Button>
          <Button variant="outline" className="w-full rounded-full" onClick={closeAsLater}>
            Later
          </Button>
          <button
            type="button"
            className="pt-1 text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              persist(markDeclined(stateRef.current, Date.now()));
              setOpen(false);
            }}
          >
            Don&apos;t ask again
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
