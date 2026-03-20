import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Image as ImageIcon, MoreHorizontal, QrCode, Share2 } from "lucide-react";
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
import { buildProfileShareUrl } from "@/lib/share/shareUrls";
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
  const [sharing, setSharing] = useState(false);
  const [manualCopyOpen, setManualCopyOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getSettings().then((s) => {
      if (!cancelled) {
        setShareUrl(buildProfileShareUrl(reptile.id, s.publicBaseUrl));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, reptile.id]);

  const shareLine = reptile.commonName || reptile.species || "pet";
  const shareText = `Meet ${reptile.name} (${shareLine})`;
  const systemShare = canUseSystemShareLink();

  const handleCopyProfileLink = async () => {
    if (!shareUrl) return;
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      toast.success("Profile link copied");
    } else {
      setManualCopyOpen(true);
    }
  };

  const handleMoreSharingOptions = async () => {
    if (!shareUrl) return;
    onOpenChange(false);
    setSharing(true);
    try {
      const result = await shareLink({
        url: shareUrl,
        title: `${reptile.name} — Reptilita`,
        text: shareText,
      });
      if (result === "unavailable") {
        const ok = await copyToClipboard(shareUrl);
        if (ok) {
          toast.success("Share sheet unavailable — profile link copied");
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
              <strong>Link</strong> — Facebook, X, WhatsApp, Telegram, Copy link, and More use your public profile URL
              (you finish the post or send in each app). <strong>Image</strong> — Instagram and Share image use a
              picture of the card you save or share yourself. Reptilita does not post to social networks for you.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 pb-1 space-y-1.5">
            <ShareActionRow
              icon={<FacebookIcon />}
              title="Facebook"
              subtitle="Public profile link — opens the Facebook share box; you complete the post there"
              disabled={!shareUrl}
              onClick={() => openExternal(buildFacebookSharerUrl(shareUrl))}
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
              subtitle="Public profile link and short text — opens the X post composer for you to send"
              disabled={!shareUrl}
              onClick={() => openExternal(buildXIntentUrl(shareUrl, shareText))}
              iconWrapClassName="bg-foreground/10 text-foreground"
            />
            <ShareActionRow
              icon={<WhatsAppIcon />}
              title="WhatsApp"
              subtitle="Message with your profile link — opens WhatsApp; you tap send"
              disabled={!shareUrl}
              onClick={() => openExternal(buildWhatsAppShareUrl(shareText, shareUrl))}
              iconWrapClassName="bg-[#25D366]/15 text-emerald-700 dark:text-emerald-400"
            />
            <ShareActionRow
              icon={<TelegramIcon />}
              title="Telegram"
              subtitle="Share URL with caption — opens Telegram; you confirm the chat and send"
              disabled={!shareUrl}
              onClick={() => openExternal(buildTelegramShareUrl(shareUrl, shareText))}
              iconWrapClassName="bg-sky-500/15 text-sky-700 dark:text-sky-400"
            />
            <ShareActionRow
              icon={<Copy className="h-5 w-5" />}
              title="Copy link"
              subtitle="Copies the public profile URL — paste it in any app"
              disabled={!shareUrl}
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
                  ? "System share sheet with your profile link — pick any app that accepts links"
                  : "No share sheet here — we copy your profile link instead"
              }
              disabled={!shareUrl || sharing}
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
            <p className="text-sm break-all font-mono select-all">{shareUrl}</p>
          </div>
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl).then(
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
