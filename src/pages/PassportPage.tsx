import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  Copy,
  Droplets,
  FileBadge,
  HeartPulse,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
  ThermometerSun,
  Utensils,
  Waves,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { PageMotion } from "@/components/motion/PageMotion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContentSkeleton } from "@/components/system/SkeletonLoaders";
import { PublicShareControls } from "@/components/share/PublicShareControls";
import {
  getCareEventsByReptile,
  getLastEventByType,
  getReptileById,
  getScheduleByReptile,
  getSettings,
} from "@/lib/storage";
import {
  canUseSystemShareLink,
  copyToClipboard,
  isNative,
  shareImage,
  shareLink,
} from "@/lib/native/sharing";
import { buildPassportShareUrl, buildPublicShareUrl } from "@/lib/share/shareUrls";
import { getPublicShareForAnimal, type PublicShareRecord } from "@/lib/share/publicShare";
import { getCategoryLabel, getDisplayEmoji } from "@/lib/animals/taxonomy";
import type { CareEvent, Reptile, ScheduleItem } from "@/types";

const SEX_LABELS: Record<string, string> = {
  unknown: "Unknown",
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

const HABITAT_LABELS: Record<string, string> = {
  terrestrial: "Terrestrial",
  arboreal: "Arboreal",
  aquatic: "Aquatic",
  "semi-aquatic": "Semi-aquatic",
  fossorial: "Fossorial",
  mixed: "Mixed",
};

const HUMIDITY_LABELS: Record<string, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  "very-high": "Very high",
};

const TEMPERATURE_LABELS: Record<string, string> = {
  cool: "Cool",
  temperate: "Temperate",
  warm: "Warm",
  hot: "Hot",
};

const UVB_LABELS: Record<string, string> = {
  none: "None",
  optional: "Optional",
  recommended: "Recommended",
  required: "Required",
};

const WATER_LABELS: Record<string, string> = {
  minimal: "Minimal",
  bowl: "Water bowl",
  "swim-area": "Swim area",
  "fully-aquatic": "Fully aquatic",
};

const HANDLING_LABELS: Record<string, string> = {
  "not-recommended": "Not recommended",
  cautious: "Cautious",
  tolerant: "Tolerant",
  calm: "Calm",
};

const BREEDING_LABELS: Record<string, string> = {
  pet: "Companion",
  breeder: "Breeder",
  hold: "Holdback",
};

type PassportRow = {
  label: string;
  value?: string | number | null;
};

type PassportSectionProps = {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  children: ReactNode;
};

function formatDateSafe(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return format(date, "MMM d, yyyy");
}

function formatAge(reptile: Reptile): string | undefined {
  if (reptile.birthDate) {
    const birth = new Date(reptile.birthDate);
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date();
      let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
      if (now.getDate() < birth.getDate()) months -= 1;
      if (months >= 24) {
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        return remainingMonths ? `${years} yr ${remainingMonths} mo` : `${years} yr`;
      }
      if (months >= 0) return `${months} mo`;
    }
  }
  return reptile.estimatedAgeMonths ? `${reptile.estimatedAgeMonths} mo estimated` : undefined;
}

function formatGeneSummary(reptile: Reptile): string | undefined {
  const parts: string[] = [];
  if (reptile.morph?.trim()) parts.push(reptile.morph.trim());
  if (reptile.genes?.length) {
    parts.push(
      reptile.genes
        .map((gene) => gene.name)
        .filter(Boolean)
        .join(", "),
    );
  }
  if (reptile.hets?.length) parts.push(`Het ${reptile.hets.join(", ")}`);
  if (reptile.geneticsNotes?.trim()) parts.push(reptile.geneticsNotes.trim());
  return parts.filter(Boolean).join(" | ") || undefined;
}

function latestHealthSummary(events: CareEvent[]): string | undefined {
  const health = events
    .filter((event) => event.eventType === "health")
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate))[0];

  if (!health) return undefined;
  const details = [
    formatDateSafe(health.eventDate),
    health.weightGrams ? `${health.weightGrams}g` : undefined,
    health.lengthCm ? `${health.lengthCm}cm` : undefined,
    health.details?.trim(),
  ].filter(Boolean);

  return details.join(" | ");
}

function meaningfulRows(rows: PassportRow[]): PassportRow[] {
  return rows.filter((row) => row.value !== undefined && row.value !== null && String(row.value).trim() !== "");
}

function PassportSection({ title, subtitle, icon, children }: PassportSectionProps) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function RowGrid({ rows }: { rows: PassportRow[] }) {
  const visibleRows = meaningfulRows(rows);
  if (!visibleRows.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      {visibleRows.map((row) => (
        <div key={row.label} className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{row.label}</p>
          <p className="mt-1 break-words font-medium leading-snug">{row.value}</p>
        </div>
      ))}
    </div>
  );
}

function NoteBlock({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="rounded-xl bg-muted/45 p-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-relaxed">{value}</p>
    </div>
  );
}

export default function PassportPage() {
  const { reptileId } = useParams<{ reptileId: string }>();
  const navigate = useNavigate();
  const passportRef = useRef<HTMLDivElement>(null);

  const [reptile, setReptile] = useState<Reptile | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [lastFeeding, setLastFeeding] = useState<CareEvent | null>(null);
  const [lastShedding, setLastShedding] = useState<CareEvent | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [publicRecord, setPublicRecord] = useState<PublicShareRecord | null>(null);
  const [publicBaseUrl, setPublicBaseUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [savingImage, setSavingImage] = useState(false);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [sharingLink, setSharingLink] = useState(false);
  const [fallbackDialogOpen, setFallbackDialogOpen] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState("");

  useEffect(() => {
    if (!reptileId) return;

    const load = async () => {
      try {
        const [rep, sched, allEvents, feeding, shedding, settings] = await Promise.all([
          getReptileById(reptileId),
          getScheduleByReptile(reptileId),
          getCareEventsByReptile(reptileId),
          getLastEventByType(reptileId, "feeding"),
          getLastEventByType(reptileId, "shedding"),
          getSettings(),
        ]);

        if (!rep) {
          navigate("/reptiles");
          return;
        }

        setReptile(rep);
        setSchedule(sched);
        setEvents(allEvents);
        setLastFeeding(feeding || null);
        setLastShedding(shedding || null);
        setShareUrl(buildPassportShareUrl(reptileId, settings.publicBaseUrl));
        setPublicBaseUrl(settings.publicBaseUrl);
        void getPublicShareForAnimal(reptileId, "passport")
          .then(setPublicRecord)
          .catch(() => setPublicRecord(null));
      } catch (error) {
        console.error("Failed to load passport data:", error);
        toast.error("Failed to load passport");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [reptileId, navigate]);

  const publicShareUrl = publicRecord ? buildPublicShareUrl("passport", publicRecord.slug, publicBaseUrl) : "";
  const activeShareUrl = publicShareUrl || shareUrl;
  const usingPublicLink = Boolean(publicShareUrl);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(activeShareUrl);
    if (success) {
      toast.success(usingPublicLink ? "Public passport link copied" : "Local-only passport link copied");
    } else {
      setFallbackUrl(activeShareUrl);
      setFallbackDialogOpen(true);
    }
  };

  const handleShareLink = async () => {
    if (!reptile) return;
    setSharingLink(true);
    try {
      const result = await shareLink({
        url: activeShareUrl,
        title: `${reptile.name} Passport | Reptilita`,
        text: `Reptilita Passport for ${reptile.name}`,
      });
      if (result === "unavailable") {
        const copied = await copyToClipboard(activeShareUrl);
        if (copied) {
          toast.success(usingPublicLink ? "Share menu unavailable; public passport link copied" : "Share menu unavailable; local-only passport link copied");
        } else {
          setFallbackUrl(activeShareUrl);
          setFallbackDialogOpen(true);
        }
      }
    } finally {
      setSharingLink(false);
    }
  };

  const handleSaveImage = useCallback(async () => {
    if (!passportRef.current || !reptile) return;

    setSavingImage(true);
    try {
      const canvas = await html2canvas(passportRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const safeName = reptile.name.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `ReptilitaPassport_${safeName}_${dateStr}.png`;

      await shareImage(dataUrl, fileName, `${reptile.name} Passport | Reptilita`);
      toast.success(isNative() ? "Passport image ready to share" : "Passport image download started");
      setSavedJustNow(true);
      setTimeout(() => setSavedJustNow(false), 1500);
    } catch (error) {
      console.error("Failed to export passport image:", error);
      toast.error("Failed to export passport image");
    } finally {
      setSavingImage(false);
    }
  }, [reptile]);

  const passportData = useMemo(() => {
    if (!reptile) return null;

    const feedSchedule = schedule.find((item) => item.taskType === "feed");
    const healthSummary = latestHealthSummary(events);
    const cautionNotes = [
      reptile.isVenomous ? "Venomous animal: trained handling only." : undefined,
      reptile.isDangerous ? "Potentially dangerous animal: use appropriate safety protocol." : undefined,
    ].filter(Boolean);

    const upcoming = schedule
      .filter((item) => item.nextDueDate >= new Date().toISOString().split("T")[0])
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
      .slice(0, 3);

    return {
      categoryLabel: getCategoryLabel(reptile.animalCategory),
      emoji: getDisplayEmoji(reptile.animalCategory, reptile.species),
      age: formatAge(reptile),
      genetics: formatGeneSummary(reptile),
      lastFeedingText: lastFeeding
        ? [formatDateSafe(lastFeeding.eventDate), lastFeeding.details?.trim()].filter(Boolean).join(" | ")
        : undefined,
      lastSheddingText: lastShedding
        ? [formatDateSafe(lastShedding.eventDate), lastShedding.details?.trim()].filter(Boolean).join(" | ")
        : undefined,
      feedingSchedule: feedSchedule ? `Every ${feedSchedule.frequencyDays} days` : undefined,
      nextFeeding: feedSchedule ? formatDateSafe(feedSchedule.nextDueDate) : undefined,
      healthSummary,
      cautionNotes,
      upcoming,
    };
  }, [events, lastFeeding, lastShedding, reptile, schedule]);

  const showSystemShare = canUseSystemShareLink();
  const imageActionLabel = savingImage
    ? "Working..."
    : savedJustNow
      ? "Done"
      : isNative()
        ? "Share image"
        : "Download image";

  if (loading || !reptile || !passportData) {
    return (
      <div className="min-h-screen bg-background page-content page-content-top">
        <ContentSkeleton />
      </div>
    );
  }

  const hasCareEssentials =
    passportData.feedingSchedule ||
    passportData.nextFeeding ||
    passportData.lastFeedingText ||
    passportData.lastSheddingText ||
    reptile.habitatType ||
    reptile.humidityPreference ||
    reptile.temperaturePreference ||
    reptile.uvbRequirement ||
    reptile.waterRequirement;

  const hasHandling = reptile.handlingProfile || reptile.notes;
  const hasHealth = passportData.cautionNotes.length > 0 || passportData.healthSummary || passportData.upcoming.length > 0;
  const hasTransfer = reptile.acquisitionDate || reptile.breedingStatus;

  return (
    <PageMotion className="min-h-screen bg-background p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="min-h-[44px] transition-all duration-200 ease-out active:scale-[0.98]"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="min-h-[44px] shadow-[var(--shadow-card)] transition-all duration-200 ease-out active:scale-[0.98]"
          >
            <Copy className="mr-1 h-4 w-4" />
            {usingPublicLink ? "Copy public link" : "Copy local link"}
          </Button>
          {showSystemShare && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareLink}
              disabled={sharingLink}
              className="min-h-[44px] shadow-[var(--shadow-card)] transition-all duration-200 ease-out active:scale-[0.98]"
            >
              <Share2 className="mr-1 h-4 w-4" />
              {sharingLink ? "Opening..." : usingPublicLink ? "Share public link" : "Share local link"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleSaveImage()}
            disabled={savingImage}
            className="min-h-[44px] shadow-[var(--shadow-card)] transition-all duration-200 ease-out active:scale-[0.98]"
          >
            {savedJustNow ? <Check className="mr-1 h-4 w-4 text-primary" /> : <ImageIcon className="mr-1 h-4 w-4" />}
            {imageActionLabel}
          </Button>
        </div>
      </div>

      <p className="mx-auto mb-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Public passport links open a read-only cloud snapshot. Local links only work where this animal is already saved.
        For rehoming, rescue, breeder handoff, or vet sharing, an exported image remains the safest portable copy.
      </p>

      <div className="mx-auto mb-4 max-w-xl">
        <PublicShareControls
          reptileId={reptile.id}
          shareType="passport"
          label="Passport"
          onRecordChange={setPublicRecord}
        />
      </div>

      <div
        ref={passportRef}
        className="mx-auto max-w-2xl overflow-hidden rounded-[1.25rem] border border-border/60 bg-background shadow-[var(--shadow-card)]"
      >
        <div className="relative min-h-[340px] overflow-hidden bg-card">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--muted)/0.7))]" />
          <div className="relative grid gap-0 sm:grid-cols-[0.9fr_1.1fr]">
            <div className="h-72 sm:h-full sm:min-h-[360px]">
              {reptile.photoUrl ? (
                <img src={reptile.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary/40 text-8xl">
                  {passportData.emoji}
                </div>
              )}
            </div>
            <div className="flex min-h-[320px] flex-col justify-between p-5 sm:p-6">
              <div>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                      Reptilita Passport
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Companion identity and care summary</p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <FileBadge className="h-5 w-5" />
                  </div>
                </div>

                <h1 className="text-4xl font-bold tracking-tight text-foreground">{reptile.name}</h1>
                <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                  {[reptile.commonName || reptile.species, reptile.morph].filter(Boolean).join(" | ")}
                </p>
                {reptile.scientificName && (
                  <p className="mt-1 text-sm italic text-muted-foreground">{reptile.scientificName}</p>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border/70 bg-background/75 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Status</p>
                  <p className="mt-1 font-semibold">{BREEDING_LABELS[reptile.breedingStatus]}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/75 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Updated</p>
                  <p className="mt-1 font-semibold">{formatDateSafe(reptile.updatedAt) || "Recorded"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-muted/25 p-4 sm:p-5">
          <PassportSection
            title="Identity"
            subtitle="Core details from this animal's saved record."
            icon={<BadgeCheck className="h-4 w-4" />}
          >
            <RowGrid
              rows={[
                { label: "Species", value: reptile.species },
                { label: "Common name", value: reptile.commonName },
                { label: "Category", value: passportData.categoryLabel },
                { label: "Group", value: reptile.speciesGroup },
                { label: "Sex", value: SEX_LABELS[reptile.sex] },
                { label: "Age", value: passportData.age },
                { label: "Hatch date", value: formatDateSafe(reptile.birthDate) },
                { label: "Acquired", value: formatDateSafe(reptile.acquisitionDate) },
              ]}
            />
            <NoteBlock label="Morph and genetics" value={passportData.genetics} />
          </PassportSection>

          {hasCareEssentials && (
            <PassportSection
              title="Care Essentials"
              subtitle="Quick husbandry context for daily care and handoff."
              icon={<Utensils className="h-4 w-4" />}
            >
              <RowGrid
                rows={[
                  { label: "Diet", value: DIET_LABELS[reptile.dietType] ?? reptile.dietType },
                  { label: "Feeding plan", value: passportData.feedingSchedule },
                  { label: "Next feeding", value: passportData.nextFeeding },
                  { label: "Last fed", value: passportData.lastFeedingText },
                  { label: "Last shed", value: passportData.lastSheddingText },
                  { label: "Habitat", value: reptile.habitatType ? HABITAT_LABELS[reptile.habitatType] ?? reptile.habitatType : undefined },
                  { label: "Humidity", value: reptile.humidityPreference ? HUMIDITY_LABELS[reptile.humidityPreference] ?? reptile.humidityPreference : undefined },
                  { label: "Temperature", value: reptile.temperaturePreference ? TEMPERATURE_LABELS[reptile.temperaturePreference] ?? reptile.temperaturePreference : undefined },
                  { label: "UVB", value: reptile.uvbRequirement ? UVB_LABELS[reptile.uvbRequirement] ?? reptile.uvbRequirement : undefined },
                  { label: "Water", value: reptile.waterRequirement ? WATER_LABELS[reptile.waterRequirement] ?? reptile.waterRequirement : undefined },
                ]}
              />
            </PassportSection>
          )}

          {(reptile.humidityPreference || reptile.temperaturePreference || reptile.uvbRequirement || reptile.waterRequirement) && (
            <motion.div
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.22 }}
            >
              {reptile.humidityPreference && (
                <div className="rounded-xl border border-border/60 bg-card/80 p-3">
                  <Droplets className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Humidity</p>
                  <p className="text-sm font-semibold">{HUMIDITY_LABELS[reptile.humidityPreference]}</p>
                </div>
              )}
              {reptile.temperaturePreference && (
                <div className="rounded-xl border border-border/60 bg-card/80 p-3">
                  <ThermometerSun className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Temperature</p>
                  <p className="text-sm font-semibold">{TEMPERATURE_LABELS[reptile.temperaturePreference]}</p>
                </div>
              )}
              {reptile.uvbRequirement && (
                <div className="rounded-xl border border-border/60 bg-card/80 p-3">
                  <Sparkles className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">UVB</p>
                  <p className="text-sm font-semibold">{UVB_LABELS[reptile.uvbRequirement]}</p>
                </div>
              )}
              {reptile.waterRequirement && (
                <div className="rounded-xl border border-border/60 bg-card/80 p-3">
                  <Waves className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Water</p>
                  <p className="text-sm font-semibold">{WATER_LABELS[reptile.waterRequirement]}</p>
                </div>
              )}
            </motion.div>
          )}

          {hasHandling && (
            <PassportSection
              title="Behavior and Handling"
              subtitle="Practical notes for safe, calm daily interaction."
              icon={<ShieldCheck className="h-4 w-4" />}
            >
              <RowGrid
                rows={[
                  {
                    label: "Handling",
                    value: reptile.handlingProfile ? HANDLING_LABELS[reptile.handlingProfile] ?? reptile.handlingProfile : undefined,
                  },
                ]}
              />
              <NoteBlock label="Care notes" value={reptile.notes} />
            </PassportSection>
          )}

          {hasHealth && (
            <PassportSection
              title="Health and Alerts"
              subtitle="Recent health context and safety flags from saved records."
              icon={<HeartPulse className="h-4 w-4" />}
            >
              {passportData.cautionNotes.length > 0 && (
                <div className="mb-3 space-y-2">
                  {passportData.cautionNotes.map((note) => (
                    <div key={note} className="flex gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <p className="leading-relaxed">{note}</p>
                    </div>
                  ))}
                </div>
              )}
              <RowGrid
                rows={[
                  { label: "Latest health", value: passportData.healthSummary },
                  ...passportData.upcoming.map((item) => ({
                    label: item.taskType === "feed" ? "Upcoming feeding" : item.taskType === "clean" ? "Upcoming cleaning" : "Upcoming check",
                    value: formatDateSafe(item.nextDueDate),
                  })),
                ]}
              />
            </PassportSection>
          )}

          {hasTransfer && (
            <PassportSection
              title="Transfer Context"
              subtitle="Useful for breeder handoff, rescue intake, rehoming, or temporary care."
              icon={<CalendarDays className="h-4 w-4" />}
            >
              <RowGrid
                rows={[
                  { label: "Role", value: BREEDING_LABELS[reptile.breedingStatus] },
                  { label: "Acquired", value: formatDateSafe(reptile.acquisitionDate) },
                ]}
              />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Dedicated breeder, rescue, transfer, and origin fields are not yet part of this local animal record.
              </p>
            </PassportSection>
          )}

          <div className="rounded-2xl border border-border/70 bg-card/90 p-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Verified local record</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Reptilita Passport is generated from data saved on this device. Export the image for recipients who do not
              have access to the same local record.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={fallbackDialogOpen} onOpenChange={setFallbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy passport link manually</DialogTitle>
          </DialogHeader>
          <p className="mb-3 text-sm text-muted-foreground">
            Automatic copy failed. Select and copy the passport URL below:
          </p>
          <div className="rounded-lg bg-muted p-3">
            <p className="select-all break-all font-mono text-sm">{fallbackUrl}</p>
          </div>
          <Button
            variant="outline"
            className="mt-2 w-full"
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
            Try copy again
          </Button>
        </DialogContent>
      </Dialog>
    </PageMotion>
  );
}
