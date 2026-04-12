import { useEffect, useState } from "react";
import { Copy, Globe, RefreshCw, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/native/sharing";
import { getSettings } from "@/lib/storage";
import { buildPublicShareUrl } from "@/lib/share/shareUrls";
import {
  createOrUpdatePublicShare,
  getPublicShareStatusForAnimal,
  regeneratePublicShare,
  revokePublicShare,
  type PublicShareRecord,
  type PublicShareStatus,
  type PublicShareType,
} from "@/lib/share/publicShare";

type PublicShareControlsProps = {
  reptileId: string;
  shareType: PublicShareType;
  label: string;
  localUpdatedAt?: string;
  onRecordChange?: (record: PublicShareRecord | null) => void;
};

function getExpiresAt(days: string): string | null {
  if (days === "never") return null;
  const parsed = Number(days);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const date = new Date();
  date.setDate(date.getDate() + parsed);
  return date.toISOString();
}

function formatExpiration(expiresAt: string | null): string {
  if (!expiresAt) return "No expiration";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "Expiration set";
  return `Expires ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function PublicShareControls({ reptileId, shareType, label, localUpdatedAt, onRecordChange }: PublicShareControlsProps) {
  const [record, setRecord] = useState<PublicShareRecord | null>(null);
  const [shareStatus, setShareStatus] = useState<PublicShareStatus>({
    state: "local-only",
    record: null,
    isStale: false,
  });
  const [loading, setLoading] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState("never");
  const [publicBaseUrl, setPublicBaseUrl] = useState<string | undefined>();

  const publicUrl = record ? buildPublicShareUrl(shareType, record.slug, publicBaseUrl) : "";

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getPublicShareStatusForAnimal(reptileId, shareType, localUpdatedAt),
      getSettings(),
    ])
      .then(([status, settings]) => {
        if (!cancelled) {
          const activeRecord = status.state === "active" ? status.record : null;
          setPublicBaseUrl(settings.publicBaseUrl);
          setShareStatus(status);
          setRecord(activeRecord);
          onRecordChange?.(activeRecord);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecord(null);
          setShareStatus({ state: "local-only", record: null, isStale: false });
          onRecordChange?.(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [localUpdatedAt, onRecordChange, reptileId, shareType]);

  const applyRecord = (nextRecord: PublicShareRecord) => {
    setRecord(nextRecord);
    setShareStatus({ state: "active", record: nextRecord, isStale: false });
    onRecordChange?.(nextRecord);
  };

  const createLink = async () => {
    setLoading(true);
    try {
      const result = await createOrUpdatePublicShare({
        reptileId,
        shareType,
        expiresAt: getExpiresAt(expiresInDays),
      });
      applyRecord(result.record);
      await copyToClipboard(buildPublicShareUrl(shareType, result.record.slug, publicBaseUrl));
      toast.success(`${label} public link ready`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create public link");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    const copied = await copyToClipboard(publicUrl);
    if (copied) toast.success("Public link copied");
    else toast.error("Copy failed. Open the public link and copy it from the address bar.");
  };

  const refreshLink = async () => {
    setLoading(true);
    try {
      const input = {
        reptileId,
        shareType,
        expiresAt: getExpiresAt(expiresInDays),
      };
      const result = shareStatus.isStale
        ? await createOrUpdatePublicShare(input)
        : await regeneratePublicShare(input);
      applyRecord(result.record);
      await copyToClipboard(buildPublicShareUrl(shareType, result.record.slug, publicBaseUrl));
      toast.success(shareStatus.isStale ? "Public snapshot updated" : "Public link regenerated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate public link");
    } finally {
      setLoading(false);
    }
  };

  const revokeLink = async () => {
    if (!record) return;
    setLoading(true);
    try {
      await revokePublicShare(record.id);
      setRecord(null);
      setShareStatus({ state: "revoked", record: null, isStale: false });
      onRecordChange?.(null);
      toast.success("Public link revoked");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke public link");
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = shareStatus.isStale && record ? "Outdated" : record ? "Active" : shareStatus.state === "expired" ? "Expired" : shareStatus.state === "revoked" ? "Revoked" : "Local-only";
  const statusClassName = record
    ? shareStatus.isStale
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "bg-primary/10 text-primary"
    : shareStatus.state === "expired" || shareStatus.state === "revoked"
      ? "bg-destructive/10 text-destructive"
      : "bg-muted text-muted-foreground";

  const description = record
    ? shareStatus.isStale
      ? "Your local animal record has newer changes than the public snapshot. Update it before sharing."
      : `Social and copy actions can use this read-only public snapshot. ${formatExpiration(record.expires_at)}.`
    : shareStatus.state === "expired"
      ? "The previous public snapshot expired. Create a fresh link when you are ready to share again."
      : shareStatus.state === "revoked"
        ? "The previous public snapshot was revoked. Create a fresh link when you are ready to share again."
        : "Create a read-only Supabase snapshot for people who do not have your local Reptilita data.";

  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-3 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-start gap-2">
        <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{label} public link</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusClassName}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <label className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Expiration</span>
        <select
          value={expiresInDays}
          onChange={(event) => setExpiresInDays(event.target.value)}
          disabled={loading}
          className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
        >
          <option value="never">No expiration</option>
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
        </select>
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {record ? (
          <>
            <Button variant="outline" size="sm" className="min-h-[40px]" onClick={copyLink} disabled={loading}>
              <Copy className="mr-1 h-4 w-4" />
              Copy public link
            </Button>
            <Button variant="outline" size="sm" className="min-h-[40px]" onClick={refreshLink} disabled={loading}>
              <RefreshCw className="mr-1 h-4 w-4" />
              {shareStatus.isStale ? "Update snapshot" : "Regenerate"}
            </Button>
            <Button variant="ghost" size="sm" className="min-h-[40px] text-destructive" onClick={revokeLink} disabled={loading}>
              <ShieldOff className="mr-1 h-4 w-4" />
              Revoke
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" className="min-h-[40px]" onClick={createLink} disabled={loading}>
            <Globe className="mr-1 h-4 w-4" />
            {loading ? "Creating..." : `Create public ${label.toLowerCase()} link`}
          </Button>
        )}
      </div>
    </div>
  );
}
