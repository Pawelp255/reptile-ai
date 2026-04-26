import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "reptilita:pwa-install-dismissed-at";
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

const isiOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const shouldSuppress = useMemo(() => {
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_WINDOW_MS;
  }, []);

  useEffect(() => {
    if (isStandalone() || shouldSuppress) {
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => setVisible(false), { once: true });

    if (isiOS()) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, [shouldSuppress]);

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible || isStandalone()) {
    return null;
  }

  return (
    <section
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 rounded-xl border border-border/70 bg-background/95 p-3 shadow-[var(--shadow-elevated)] backdrop-blur-sm"
      role="dialog"
      aria-label="Install Reptilita"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Install Reptilita</p>
          {deferredPrompt ? (
            <p className="text-xs text-muted-foreground">Install for a faster full-screen app experience.</p>
          ) : (
            <p className="text-xs text-muted-foreground">On iPhone/iPad: Tap Share, then tap Add to Home Screen.</p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {deferredPrompt && (
        <button
          type="button"
          onClick={install}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
        >
          Install App
        </button>
      )}
    </section>
  );
}
