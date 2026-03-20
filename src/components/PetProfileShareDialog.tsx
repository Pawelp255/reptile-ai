import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, QrCode, Send, Share2 } from "lucide-react";
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
import type { Reptile } from "@/types";

type PetProfileShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reptile: Reptile;
};

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

  const handleShareProfileLink = async () => {
    if (!shareUrl) return;
    setSharing(true);
    try {
      const result = await shareLink({
        url: shareUrl,
        title: `${reptile.name} — Reptilita`,
        text: `Meet ${reptile.name} (${reptile.commonName || reptile.species})`,
      });
      if (result === "unavailable") {
        const ok = await copyToClipboard(shareUrl);
        if (ok) {
          toast.success("Share menu not available — profile link copied");
        } else {
          setManualCopyOpen(true);
        }
      }
    } finally {
      setSharing(false);
    }
  };

  const handleCopyProfileLink = async () => {
    if (!shareUrl) return;
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      toast.success("Profile link copied");
    } else {
      setManualCopyOpen(true);
    }
  };

  const openSharePreview = () => {
    onOpenChange(false);
    navigate(`/share-profile/${reptile.id}`);
  };

  const openCareCard = () => {
    onOpenChange(false);
    navigate(`/care-card/${reptile.id}`);
  };

  const systemShare = canUseSystemShareLink();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share {reptile.name}&apos;s profile</DialogTitle>
            <DialogDescription className="text-left space-y-2 pt-1">
              <span className="block">
                Share a <strong>profile link</strong> (opens in Reptilita where your animal is saved) or a{" "}
                <strong>share image</strong> for posts and stories.
              </span>
              <span className="block text-xs opacity-90">
                Reptilita does not post to Facebook, Instagram, or X — your device shares or saves the link
                or image you choose.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              className="w-full min-h-[52px] h-auto flex flex-col gap-1 py-3"
              onClick={openSharePreview}
              disabled={!shareUrl}
            >
              <span className="flex items-center justify-center gap-2 font-semibold">
                <Share2 className="w-4 h-4 shrink-0" />
                Share profile
              </span>
              <span className="text-xs font-normal opacity-90 px-1 leading-snug">
                Photo-first preview — copy the profile link or download a card for social posts
              </span>
            </Button>

            {systemShare && (
              <Button
                variant="outline"
                className="w-full min-h-[48px] justify-start"
                onClick={handleShareProfileLink}
                disabled={!shareUrl || sharing}
              >
                <Send className="w-4 h-4 mr-2 shrink-0" />
                {sharing ? "Opening…" : "Share profile link (apps)"}
              </Button>
            )}

            {!systemShare && (
              <p className="text-xs text-muted-foreground px-0.5">
                No system share menu in this browser — open <strong>Share profile</strong> for the preview, or copy
                the link below.
              </p>
            )}

            <Button
              variant="outline"
              className="w-full min-h-[48px] justify-start"
              onClick={handleCopyProfileLink}
              disabled={!shareUrl}
            >
              <Copy className="w-4 h-4 mr-2 shrink-0" />
              Copy profile link
            </Button>

            <Button
              variant="outline"
              className="w-full min-h-[48px] justify-start text-muted-foreground border-dashed"
              onClick={openCareCard}
            >
              <QrCode className="w-4 h-4 mr-2 shrink-0" />
              Open care summary (QR)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manualCopyOpen} onOpenChange={setManualCopyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy profile link manually</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Automatic copy failed. Select and copy the URL below:
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
