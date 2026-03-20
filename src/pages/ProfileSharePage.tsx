// Share-friendly pet profile — link, native share, and image export (distinct from Care Card)
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Image as ImageIcon, Check, Share2 } from "lucide-react";
import { PageMotion } from "@/components/motion/PageMotion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import {
  getReptileById,
  getScheduleByReptile,
  getLastEventByType,
  getSettings,
} from "@/lib/storage";
import {
  copyToClipboard,
  shareImage,
  shareLink,
  canUseSystemShareLink,
  isNative,
} from "@/lib/native/sharing";
import { buildProfileShareUrl } from "@/lib/share/shareUrls";
import { getDisplayEmoji } from "@/lib/animals/taxonomy";
import { ContentSkeleton } from "@/components/system/SkeletonLoaders";
import type { Reptile, ScheduleItem, CareEvent, TaskType } from "@/types";

const TASK_LABELS: Record<TaskType, string> = {
  feed: "Feeding",
  clean: "Cleaning",
  check: "Health check",
};

const SEX_LABELS: Record<string, string> = {
  unknown: "Sex unknown",
  male: "Male",
  female: "Female",
};

const DIET_LABELS: Record<string, string> = {
  insects: "Insects",
  rodents: "Rodents",
  fish: "Fish",
  herbivore: "Herbivore",
  omnivore: "Omnivore",
  pellets: "Pellets / prepared",
  mixed: "Mixed",
};

const BREEDING_LABELS: Record<string, string> = {
  pet: "Pet",
  breeder: "Breeder",
  hold: "Hold",
};

export default function ProfileSharePage() {
  const { reptileId } = useParams<{ reptileId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [reptile, setReptile] = useState<Reptile | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [lastFeeding, setLastFeeding] = useState<CareEvent | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [savingImage, setSavingImage] = useState(false);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [sharingLink, setSharingLink] = useState(false);
  const [fallbackDialogOpen, setFallbackDialogOpen] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reptileId) return;

    const load = async () => {
      try {
        const [rep, sched, feeding, settings] = await Promise.all([
          getReptileById(reptileId),
          getScheduleByReptile(reptileId),
          getLastEventByType(reptileId, "feeding"),
          getSettings(),
        ]);

        if (!rep) {
          navigate("/reptiles");
          return;
        }

        setReptile(rep);
        setSchedule(sched);
        setLastFeeding(feeding || null);
        setShareUrl(buildProfileShareUrl(reptileId, settings.publicBaseUrl));
      } catch (error) {
        console.error("Failed to load profile share data:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reptileId, navigate]);

  const exportCardImage = useCallback(async () => {
    if (!cardRef.current || !reptile) return;

    setSavingImage(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const safeName = reptile.name.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `Profile_${safeName}_${dateStr}.png`;

      await shareImage(dataUrl, fileName, `${reptile.name} — Reptilita`);
      toast.success(isNative() ? "Image ready to share" : "Image download started");
      setSavedJustNow(true);
      setTimeout(() => setSavedJustNow(false), 1500);
    } catch (error) {
      console.error("Failed to save profile image:", error);
      toast.error("Failed to save image");
    } finally {
      setSavingImage(false);
    }
  }, [reptile]);

  const instagramHintRequested = searchParams.get("instagram") === "1";
  const autoExportRequested = searchParams.get("autoExport") === "1";

  useEffect(() => {
    if (!instagramHintRequested || loading || !reptile) return;
    toast("Save image for Instagram", {
      description:
        "Use Share image or Download share image below, then create a new post in Instagram and pick that saved photo. Profile links are for other apps — Instagram works best with the image.",
      duration: 6500,
    });
    requestAnimationFrame(() => {
      document.getElementById("profile-share-export-actions")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("instagram");
        return next;
      },
      { replace: true },
    );
  }, [instagramHintRequested, loading, reptile, setSearchParams]);

  useEffect(() => {
    if (!autoExportRequested || loading || !reptile) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          if (cancelled) return;
          if (cardRef.current) await exportCardImage();
          else {
            toast.info("Use Share image below to export your card.");
          }
        } finally {
          if (!cancelled) {
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                next.delete("autoExport");
                return next;
              },
              { replace: true },
            );
          }
        }
      })();
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [autoExportRequested, loading, reptile, exportCardImage, setSearchParams]);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      toast.success("Link copied to clipboard");
    } else {
      setFallbackUrl(shareUrl);
      setFallbackDialogOpen(true);
    }
  };

  const handleShareLink = async () => {
    if (!reptile) return;
    setSharingLink(true);
    try {
      const result = await shareLink({
        url: shareUrl,
        title: `${reptile.name} — Reptilita`,
        text: `Meet ${reptile.name} (${reptile.commonName || reptile.species})`,
      });
      if (result === "unavailable") {
        const copied = await copyToClipboard(shareUrl);
        if (copied) {
          toast.success("Share menu unavailable — profile link copied instead");
        } else {
          toast.error("Sharing not available on this device");
          setFallbackUrl(shareUrl);
          setFallbackDialogOpen(true);
        }
      }
    } finally {
      setSharingLink(false);
    }
  };

  const handleSaveImage = () => {
    void exportCardImage();
  };

  const feedSchedule = schedule.find((s) => s.taskType === "feed");
  const emoji = reptile
    ? getDisplayEmoji(reptile.animalCategory, reptile.species)
    : "";

  const showSystemShare = canUseSystemShareLink();
  const imageActionLabel = savingImage
    ? "Working…"
    : savedJustNow
      ? "Done"
      : isNative()
        ? "Share image"
        : "Download share image";

  if (loading || !reptile) {
    return (
      <div className="min-h-screen bg-background page-content page-content-top">
        <ContentSkeleton />
      </div>
    );
  }

  return (
    <PageMotion className="min-h-screen bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="min-h-[44px] transition-all duration-200 ease-out active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div
          id="profile-share-export-actions"
          className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto sm:max-w-none scroll-mt-24"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="min-h-[44px] transition-all duration-200 ease-out active:scale-[0.98] shadow-[var(--shadow-card)]"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy profile link
          </Button>
          {showSystemShare && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareLink}
              disabled={sharingLink}
              className="min-h-[44px] transition-all duration-200 ease-out active:scale-[0.98] shadow-[var(--shadow-card)]"
            >
              <Share2 className="w-4 h-4 mr-1" />
              {sharingLink ? "Opening…" : "Share profile link"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveImage}
            disabled={savingImage}
            className="min-h-[44px] transition-all duration-200 ease-out active:scale-[0.98] shadow-[var(--shadow-card)]"
          >
            {savedJustNow ? (
              <Check className="w-4 h-4 mr-1 text-primary" />
            ) : (
              <ImageIcon className="w-4 h-4 mr-1" />
            )}
            {imageActionLabel}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4 px-0.5 leading-relaxed">
        This card is what you share as an <strong>image</strong> (e.g. Instagram or Facebook). The{" "}
        <strong>profile link</strong> opens Reptilita on a device that already has your data. Reptilita never posts to
        social networks for you.
      </p>
      {!showSystemShare && (
        <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4 px-0.5">
          No share menu in this browser — use <strong>Copy profile link</strong> or <strong>Download share image</strong>.
        </p>
      )}

      <div
        ref={cardRef}
        className="max-w-md mx-auto premium-surface-elevated border border-border/50 rounded-[1.25rem] overflow-hidden bg-card"
      >
        <div className="relative h-52 sm:h-56 bg-gradient-to-br from-secondary/80 to-muted overflow-hidden">
          {reptile.photoUrl ? (
            <img
              src={reptile.photoUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl bg-gradient-to-br from-primary/15 to-secondary/40">
              {emoji}
            </div>
          )}
        </div>

        <div className="bg-primary px-5 py-5 sm:py-6 text-primary-foreground">
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-80 font-medium">Pet profile</p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{reptile.name}</h1>
          <p className="text-sm opacity-95 mt-1 leading-snug">
            {[reptile.commonName, reptile.species].filter(Boolean).join(" · ") || reptile.species}
            {reptile.morph ? ` · ${reptile.morph}` : ""}
          </p>
          <p className="text-sm opacity-90 mt-2">
            {SEX_LABELS[reptile.sex] ?? reptile.sex} · {DIET_LABELS[reptile.dietType] ?? reptile.dietType}
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Breeding</span>
              <p className="font-medium">
                {BREEDING_LABELS[reptile.breedingStatus] ?? reptile.breedingStatus}
              </p>
            </div>
            {reptile.habitatType && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Habitat</span>
                <p className="font-medium capitalize">{reptile.habitatType.replace(/-/g, " ")}</p>
              </div>
            )}
            {reptile.scientificName && (
              <div className="col-span-2">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Scientific name</span>
                <p className="font-medium italic">{reptile.scientificName}</p>
              </div>
            )}
          </div>

          {feedSchedule && (
            <div className="pt-3 border-t border-border">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Next feeding due</span>
              <p className="font-medium">
                {format(new Date(feedSchedule.nextDueDate), "MMM d, yyyy")}
              </p>
            </div>
          )}

          {lastFeeding && (
            <div className="pt-3 border-t border-border">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Last feeding</span>
              <p className="font-medium">
                {format(new Date(lastFeeding.eventDate), "MMM d, yyyy")}
              </p>
            </div>
          )}

          {schedule.filter((s) => s.taskType !== "feed").length > 0 && (
            <div className="pt-3 border-t border-border">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Other upcoming</span>
              <div className="mt-1 space-y-1">
                {schedule
                  .filter((s) => s.taskType !== "feed")
                  .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
                  .slice(0, 2)
                  .map((t) => (
                    <div key={t.id} className="flex justify-between gap-2">
                      <span className="font-medium">{TASK_LABELS[t.taskType]}</span>
                      <span className="text-muted-foreground shrink-0">
                        {format(new Date(t.nextDueDate), "MMM d")}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <motion.div
            className="pt-4 border-t border-border/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.2 }}
          >
            <p className="text-center text-xs text-muted-foreground">
              Reptilita · profile link opens in the app where this animal is saved
            </p>
          </motion.div>
        </div>
      </div>

      <Dialog open={fallbackDialogOpen} onOpenChange={setFallbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy profile link manually</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Automatic copy failed. Select and copy the profile URL below:
          </p>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm break-all font-mono select-all">{fallbackUrl}</p>
          </div>
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => {
              navigator.clipboard?.writeText(fallbackUrl).then(
                () => {
                  toast.success("Link copied");
                  setFallbackDialogOpen(false);
                },
                () => toast.error("Please select and copy manually"),
              );
            }}
          >
            Try Copy Again
          </Button>
        </DialogContent>
      </Dialog>
    </PageMotion>
  );
}
