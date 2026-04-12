import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, FileBadge, Image as ImageIcon, MoreHorizontal, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/storage";
import {
  copyToClipboard,
  shareLink,
  canUseSystemShareLink,
} from "@/lib/native/sharing";
import { buildProfileShareUrl, buildPublicShareUrl } from "@/lib/share/shareUrls";
import {
  buildFacebookSharerUrl,
  buildTelegramShareUrl,
  buildWhatsAppShareUrl,
  buildXIntentUrl,
  openUrlInNewTab,
} from "@/lib/share/socialShareLinks";
import {
  FacebookIcon,
  InstagramIcon,
  TelegramIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/share/SocialSharePlatformIcons";
import { PublicShareControls } from "@/components/share/PublicShareControls";
import { getPublicShareStatusForAnimal, type PublicShareRecord } from "@/lib/share/publicShare";
import { cn } from "@/lib/utils";
import type { Reptile } from "@/types";
import type { ReactNode } from "react";

type PetProfileShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reptile: Reptile;
};

function ShareActionRow({
  icon,
  title,
  subtitle,
  onClick,
  disabled,
  iconWrapClassName,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
  iconWrapClassName?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card/40 px-3 py-2.5 text-left transition-colors",
        "hover:bg-muted/60 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45",
        "min-h-[56px] shadow-sm",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg [&_svg]:h-5 [&_svg]:w-5",
          iconWrapClassName,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">{subtitle}</span>
      </span>
    </button>
  );
}

export function PetProfileShareDialog({ open, onOpenChange, reptile }: PetProfileShareDialogProps) {
  const navigate = useNavigate();
  const [shareUrl, setShareUrl] = useState("");
  const [publicRecord, setPublicRecord] = useState<PublicShareRecord | null>(null);
  const [publicBaseUrl, setPublicBaseUrl] = useState<string | undefined>();
  const [sharing, setSharing] = useState(false);
  const [manualCopyOpen, setManualCopyOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    getSettings().then((s) => {
      if (!cancelled) {
        setShareUrl(buildProfileShareUrl(reptile.id, s.publicBaseUrl));
        setPublicBaseUrl(s.publicBaseUrl);
      }
    }).catch(() => {
      if (!cancelled) setShareUrl(buildProfileShareUrl(reptile.id));
    });

    getPublicShareStatusForAnimal(reptile.id, "profile", reptile.updatedAt).then((status) => {
      if (!cancelled) {
        setPublicRecord(status.state === "active" ? status.record : null);
      }
    }).catch(() => {
      if (!cancelled) setPublicRecord(null);
    });

    return () => {
      cancelled = true;
    };
  }, [open, reptile.id, reptile.updatedAt]);

  const shareLine = reptile.commonName || reptile.species || "pet";
  const shareText = `Meet ${reptile.name} (${shareLine})`;
  const systemShare = canUseSystemShareLink();
  const publicShareUrl = publicRecord ? buildPublicShareUrl("profile", publicRecord.slug, publicBaseUrl) : "";
  const activeShareUrl = publicShareUrl || shareUrl;
  const usingPublicLink = Boolean(publicShareUrl);
  const linkKindLabel = usingPublicLink ? "public snapshot link" : "local-only profile link";

  const handleCopyProfileLink = async () => {
    if (!activeShareUrl) return;
    const ok = await copyToClipboard(activeShareUrl);
    if (ok) {
      toast.success(usingPublicLink ? "Public profile link copied" : "Local-only profile link copied");
    } else {
      setManualCopyOpen(true);
    }
  };

  const handleMoreSharingOptions = async () => {
    if (!activeShareUrl) return;
    onOpenChange(false);
    setSharing(true);
    try {
      const result = await shareLink({
        url: activeShareUrl,
        title: `${reptile.name} — Reptilita`,
        text: shareText,
      });
      if (result === "unavailable") {
        const ok = await copyToClipboard(activeShareUrl);
        if (ok) {
          toast.success(`Share sheet unavailable; ${linkKindLabel} copied`);
        } else {
          setManualCopyOpen(true);
        }
      }
    } finally {
      setSharing(false);
    }
  };

  const goToSharePage = (search: string) => {
    onOpenChange(false);
    navigate(`/share-profile/${reptile.id}${search}`);
  };

  const openExternal = (url: string) => {
    onOpenChange(false);
    openUrlInNewTab(url);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[min(92dvh,720px)] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 text-left space-y-1.5 shrink-0">
            <DialogTitle className="text-lg">Share {reptile.name}&apos;s profile</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm leading-relaxed">
              <strong>Link</strong> actions use the {linkKindLabel}. Create a public link below for people who do not
              have your local data. <strong>Image</strong> actions export a card photo. Reptilita does not post to
              social networks for you.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 pb-1 space-y-1.5">
            <ShareActionRow
              icon={<FacebookIcon />}
              title="Facebook"
              subtitle={`${usingPublicLink ? "Public" : "Local-only"} profile link; you complete the post there`}
              disabled={!activeShareUrl}
              onClick={() => openExternal(buildFacebookSharerUrl(activeShareUrl))}
              iconWrapClassName="bg-[#1877F2]/15 text-[#1877F2]"
            />
            <ShareActionRow
              icon={<InstagramIcon />}
              title="Instagram"
              subtitle="Image only — export the card as a photo, then add it in Instagram (no link post, no auto-post)"
              onClick={() => goToSharePage("?instagram=1")}
              iconWrapClassName="bg-gradient-to-br from-fuchsia-500/15 to-orange-400/15 text-fuchsia-700 dark:text-fuchsia-400"
            />
            <ShareActionRow
              icon={<XIcon />}
              title="X"
              subtitle={`${usingPublicLink ? "Public" : "Local-only"} link and short text; you send the post`}
              disabled={!activeShareUrl}
              onClick={() => openExternal(buildXIntentUrl(activeShareUrl, shareText))}
              iconWrapClassName="bg-foreground/10 text-foreground"
            />
            <ShareActionRow
              icon={<WhatsAppIcon />}
              title="WhatsApp"
              subtitle={`Message with your ${usingPublicLink ? "public" : "local-only"} profile link`}
              disabled={!activeShareUrl}
              onClick={() => openExternal(buildWhatsAppShareUrl(shareText, activeShareUrl))}
              iconWrapClassName="bg-[#25D366]/15 text-emerald-700 dark:text-emerald-400"
            />
            <ShareActionRow
              icon={<TelegramIcon />}
              title="Telegram"
              subtitle={`Share ${usingPublicLink ? "public" : "local-only"} URL with caption`}
              disabled={!activeShareUrl}
              onClick={() => openExternal(buildTelegramShareUrl(activeShareUrl, shareText))}
              iconWrapClassName="bg-sky-500/15 text-sky-700 dark:text-sky-400"
            />
            <ShareActionRow
              icon={<Copy className="h-5 w-5" />}
              title="Copy link"
              subtitle={`Copies the ${linkKindLabel}; paste it in any app`}
              disabled={!activeShareUrl}
              onClick={() => void handleCopyProfileLink()}
              iconWrapClassName="bg-muted text-foreground"
            />
            <ShareActionRow
              icon={<ImageIcon className="h-5 w-5" />}
              title="Share image"
              subtitle="PNG of this card — device share sheet on the phone, or download in the browser"
              onClick={() => goToSharePage("?autoExport=1")}
              iconWrapClassName="bg-primary/12 text-primary"
            />
            <ShareActionRow
              icon={<MoreHorizontal className="h-5 w-5" />}
              title="More…"
              subtitle={
                systemShare
                  ? `System share sheet with your ${linkKindLabel}`
                  : `No share sheet here; we copy your ${linkKindLabel} instead`
              }
              disabled={!activeShareUrl || sharing}
              onClick={() => void handleMoreSharingOptions()}
              iconWrapClassName="bg-muted text-foreground"
            />

            {!systemShare && (
              <p className="text-[11px] text-muted-foreground px-1 pt-0.5 pb-1 leading-snug">
                This browser has no share menu — tap <strong>More…</strong> to copy your link, or use{" "}
                <strong>Copy link</strong>.
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-border/80 bg-muted/20 px-3 sm:px-4 py-3 space-y-1.5">
            <PublicShareControls
              reptileId={reptile.id}
              shareType="profile"
              label="Profile"
              localUpdatedAt={reptile.updatedAt}
              onRecordChange={setPublicRecord}
            />
            <Button
              variant="secondary"
              className="w-full min-h-[48px] justify-start gap-2 rounded-xl"
              onClick={() => goToSharePage("")}
            >
              <Share2 className="w-4 h-4 shrink-0 opacity-80" />
              <span className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-medium leading-none">Open share card</span>
                <span className="text-xs font-normal text-muted-foreground leading-snug">
                  Full-screen preview — copy link, share link, or export image
                </span>
              </span>
            </Button>
            <Button
              variant="ghost"
              className="w-full min-h-[44px] justify-start gap-2 text-muted-foreground rounded-xl"
              onClick={() => {
                onOpenChange(false);
                navigate(`/passport/${reptile.id}`);
              }}
            >
              <FileBadge className="w-4 h-4 shrink-0" />
              Open Reptilita Passport
            </Button>
            <Button
              variant="ghost"
              className="w-full min-h-[44px] justify-start gap-2 text-muted-foreground rounded-xl"
              onClick={() => {
                onOpenChange(false);
                navigate(`/care-card/${reptile.id}`);
              }}
            >
              <QrCode className="w-4 h-4 shrink-0" />
              Open care summary (QR)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manualCopyOpen} onOpenChange={setManualCopyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy link manually</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Automatic copy failed. Select and copy the profile URL below:
          </p>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm break-all font-mono select-all">{activeShareUrl}</p>
          </div>
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => {
              navigator.clipboard?.writeText(activeShareUrl).then(
                () => {
                  toast.success("Link copied");
                  setManualCopyOpen(false);
                },
                () => toast.error("Please select and copy manually"),
              );
            }}
          >
            Try copy again
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
