import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  FileBadge,
  HeartPulse,
  ShieldCheck,
  Utensils,
} from "lucide-react";
import { PageMotion } from "@/components/motion/PageMotion";
import { ContentSkeleton } from "@/components/system/SkeletonLoaders";
import {
  getPublicShareBySlug,
  parsePublicSharePayload,
  type PublicSharePayload,
  type PublicShareType,
} from "@/lib/share/publicShare";

const VALID_SHARE_TYPES: PublicShareType[] = ["profile", "passport", "care-card"];

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

const TASK_LABELS: Record<string, string> = {
  feed: "Feeding",
  clean: "Cleaning",
  check: "Health check",
};

const TYPE_LABELS: Record<PublicShareType, string> = {
  profile: "Public Profile",
  passport: "Reptilita Passport",
  "care-card": "Care Card",
};

type Row = {
  label: string;
  value?: string | number | null;
};

function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return format(date, "MMM d, yyyy");
}

function displayValue(value?: string): string | undefined {
  if (!value) return undefined;
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function rowsWithValues(rows: Row[]): Row[] {
  return rows.filter((row) => row.value !== undefined && row.value !== null && String(row.value).trim() !== "");
}

function InfoSection({
  title,
  icon,
  rows,
  note,
}: {
  title: string;
  icon: ReactNode;
  rows: Row[];
  note?: string;
}) {
  const visibleRows = rowsWithValues(rows);
  if (!visibleRows.length && !note) return null;

  return (
    <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {visibleRows.length > 0 && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {visibleRows.map((row) => (
            <div key={row.label} className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{row.label}</p>
              <p className="mt-1 break-words font-medium leading-snug">{row.value}</p>
            </div>
          ))}
        </div>
      )}
      {note && <p className="mt-3 rounded-xl bg-muted/45 p-3 text-sm leading-relaxed">{note}</p>}
    </section>
  );
}

function buildCareRows(payload: PublicSharePayload): Row[] {
  const animal = payload.animal;
  const care = payload.care;
  const feeding = care.lastFeeding
    ? [formatDate(care.lastFeeding.eventDate), care.lastFeeding.details].filter(Boolean).join(" | ")
    : undefined;
  const shedding = care.lastShedding
    ? [formatDate(care.lastShedding.eventDate), care.lastShedding.details].filter(Boolean).join(" | ")
    : undefined;

  return [
    { label: "Diet", value: animal.dietType ? DIET_LABELS[animal.dietType] ?? displayValue(animal.dietType) : undefined },
    { label: "Last fed", value: feeding },
    { label: "Last shed", value: shedding },
    { label: "Habitat", value: displayValue(animal.habitatType) },
    { label: "Humidity", value: displayValue(animal.humidityPreference) },
    { label: "Temperature", value: displayValue(animal.temperaturePreference) },
    { label: "UVB", value: displayValue(animal.uvbRequirement) },
    { label: "Water", value: displayValue(animal.waterRequirement) },
  ];
}

export default function PublicSharePage() {
  const { shareType, slug } = useParams<{ shareType: string; slug: string }>();
  const [payload, setPayload] = useState<PublicSharePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!slug || !shareType || !VALID_SHARE_TYPES.includes(shareType as PublicShareType)) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const record = await getPublicShareBySlug(shareType as PublicShareType, slug);
        const parsed = record ? parsePublicSharePayload(record.payload) : null;
        if (!parsed) {
          setNotFound(true);
          return;
        }
        setPayload(parsed);
      } catch (error) {
        console.error("Failed to load public share:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [shareType, slug]);

  const content = useMemo(() => {
    if (!payload) return null;
    const animal = payload.animal;
    const care = payload.care;
    const latestHealth = care.latestHealth
      ? [
          formatDate(care.latestHealth.eventDate),
          care.latestHealth.weightGrams ? `${care.latestHealth.weightGrams}g` : undefined,
          care.latestHealth.lengthCm ? `${care.latestHealth.lengthCm}cm` : undefined,
          care.latestHealth.details,
        ]
          .filter(Boolean)
          .join(" | ")
      : undefined;

    return {
      animal,
      care,
      latestHealth,
      title: TYPE_LABELS[payload.shareType],
      subtitle: [animal.commonName || animal.species, animal.morph].filter(Boolean).join(" | "),
      warnings: [
        animal.isVenomous ? "Venomous animal: trained handling only." : undefined,
        animal.isDangerous ? "Potentially dangerous animal: use appropriate safety protocol." : undefined,
      ].filter(Boolean),
    };
  }, [payload]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background page-content page-content-top">
        <ContentSkeleton />
      </div>
    );
  }

  if (notFound || !payload || !content) {
    return (
      <PageMotion className="min-h-screen bg-background p-4 sm:p-5">
        <div className="mx-auto max-w-md rounded-2xl border border-border/70 bg-card p-5 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-xl font-semibold">Share link unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This public Reptilita link may have been revoked, expired, or mistyped.
          </p>
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion className="min-h-screen bg-background p-4 sm:p-5">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-[1.25rem] border border-border/60 bg-background shadow-[var(--shadow-card)]">
        <div className="relative overflow-hidden bg-card">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--muted)/0.7))]" />
          <div className="relative grid sm:grid-cols-[0.9fr_1.1fr]">
            <div className="h-72 sm:min-h-[360px]">
              {content.animal.photoUrl ? (
                <img src={content.animal.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary/40 text-6xl">
                  Reptilita
                </div>
              )}
            </div>
            <div className="flex min-h-[320px] flex-col justify-between p-5 sm:p-6">
              <div>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{content.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Read-only public snapshot</p>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <FileBadge className="h-5 w-5" />
                  </div>
                </div>
                <h1 className="text-4xl font-bold tracking-tight">{content.animal.name}</h1>
                <p className="mt-2 text-base leading-relaxed text-muted-foreground">{content.subtitle}</p>
                {content.animal.scientificName && (
                  <p className="mt-1 text-sm italic text-muted-foreground">{content.animal.scientificName}</p>
                )}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border/70 bg-background/75 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Species</p>
                  <p className="mt-1 font-semibold">{content.animal.species}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/75 p-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Updated</p>
                  <p className="mt-1 font-semibold">{formatDate(content.animal.updatedAt) || "Shared"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-muted/25 p-4 sm:p-5">
          <InfoSection
            title="Identity"
            icon={<BadgeCheck className="h-4 w-4" />}
            rows={[
              { label: "Common name", value: content.animal.commonName },
              { label: "Category", value: displayValue(content.animal.animalCategory) },
              { label: "Group", value: content.animal.speciesGroup },
              { label: "Sex", value: content.animal.sex ? SEX_LABELS[content.animal.sex] ?? content.animal.sex : undefined },
              { label: "Birth date", value: formatDate(content.animal.birthDate) },
              { label: "Est. age", value: content.animal.estimatedAgeMonths ? `${content.animal.estimatedAgeMonths} months` : undefined },
            ]}
            note={content.animal.geneticsSummary}
          />

          <InfoSection
            title="Care Essentials"
            icon={<Utensils className="h-4 w-4" />}
            rows={buildCareRows(payload)}
          />

          <InfoSection
            title="Behavior and Handling"
            icon={<ShieldCheck className="h-4 w-4" />}
            rows={[
              { label: "Handling", value: displayValue(content.animal.handlingProfile) },
            ]}
            note={content.animal.notes}
          />

          <InfoSection
            title="Health and Alerts"
            icon={<HeartPulse className="h-4 w-4" />}
            rows={[
              { label: "Latest health", value: content.latestHealth },
              ...content.care.upcomingTasks.map((item) => ({
                label: TASK_LABELS[item.taskType] ?? item.taskType,
                value: `${formatDate(item.nextDueDate)} | every ${item.frequencyDays} days`,
              })),
            ]}
            note={content.warnings.join(" ")}
          />

          {payload.shareType === "passport" && (
            <InfoSection
              title="Transfer Context"
              icon={<CalendarDays className="h-4 w-4" />}
              rows={[
                { label: "Role", value: displayValue(content.animal.breedingStatus) },
                { label: "Acquired", value: formatDate(content.animal.acquisitionDate) },
              ]}
            />
          )}

          <div className="rounded-2xl border border-border/70 bg-card/90 p-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Reptilita public share</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              This is a read-only snapshot shared by the keeper. It does not expose the keeper's full local database.
            </p>
          </div>
        </div>
      </div>
    </PageMotion>
  );
}
