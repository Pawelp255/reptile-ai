// Care Card — shareable reptile summary view with QR code
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Image as ImageIcon, Check } from 'lucide-react';
import { PageMotion } from '@/components/motion/PageMotion';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import {
  getReptileById,
  getScheduleByReptile,
  getLastEventByType,
  getSettings,
} from '@/lib/storage';
import { copyToClipboard, shareImage } from '@/lib/native/sharing';
import { buildCareCardShareUrl, buildPublicShareUrl } from '@/lib/share/shareUrls';
import { ContentSkeleton } from '@/components/system/SkeletonLoaders';
import { PublicShareControls } from '@/components/share/PublicShareControls';
import { getPublicShareForAnimal, type PublicShareRecord } from '@/lib/share/publicShare';
import type { Reptile, ScheduleItem, CareEvent, TaskType } from '@/types';

const TASK_LABELS: Record<TaskType, string> = {
  feed: 'Feeding',
  clean: 'Cleaning',
  check: 'Health Check',
};

const SEX_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  male: 'Male',
  female: 'Female',
};

const DIET_LABELS: Record<string, string> = {
  insects: 'Insects',
  rodents: 'Rodents',
  fish: 'Fish',
  herbivore: 'Herbivore',
  omnivore: 'Omnivore',
  pellets: 'Pellets / Prepared',
  mixed: 'Mixed',
};

export default function CareCardPage() {
  const { reptileId } = useParams<{ reptileId: string }>();
  const navigate = useNavigate();

  const [reptile, setReptile] = useState<Reptile | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [lastFeeding, setLastFeeding] = useState<CareEvent | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [publicRecord, setPublicRecord] = useState<PublicShareRecord | null>(null);
  const [publicBaseUrl, setPublicBaseUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [savingImage, setSavingImage] = useState(false);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [fallbackDialogOpen, setFallbackDialogOpen] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reptileId) return;

    const load = async () => {
      try {
        const [rep, sched, feeding, settings] = await Promise.all([
          getReptileById(reptileId),
          getScheduleByReptile(reptileId),
          getLastEventByType(reptileId, 'feeding'),
          getSettings(),
        ]);

        if (!rep) {
          navigate('/reptiles');
          return;
        }

        setReptile(rep);
        setSchedule(sched);
        setLastFeeding(feeding || null);

        // Build share URL using publicBaseUrl if set
        const url = buildCareCardShareUrl(reptileId, settings.publicBaseUrl);
        setPublicBaseUrl(settings.publicBaseUrl);
        setShareUrl(url);
        void getPublicShareForAnimal(reptileId, 'care-card')
          .then(setPublicRecord)
          .catch(() => setPublicRecord(null));
      } catch (error) {
        console.error('Failed to load care card data:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reptileId, navigate]);

  const publicShareUrl = publicRecord ? buildPublicShareUrl('care-card', publicRecord.slug, publicBaseUrl) : '';
  const activeShareUrl = publicShareUrl || shareUrl;
  const usingPublicLink = Boolean(publicShareUrl);

  useEffect(() => {
    if (!activeShareUrl) return;
    QRCode.toDataURL(activeShareUrl, {
      width: 120,
      margin: 1,
      color: { dark: '#2a9d8f', light: '#ffffff' },
    }).then(setQrDataUrl).catch((error) => {
      console.error('Failed to generate care card QR:', error);
    });
  }, [activeShareUrl]);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(activeShareUrl);
    if (success) {
      toast.success(publicShareUrl ? 'Public care card link copied' : 'Local-only care card link copied');
    } else {
      // Show fallback dialog with selectable URL
      setFallbackUrl(activeShareUrl);
      setFallbackDialogOpen(true);
    }
  };

  const handleSaveImage = async () => {
    if (!cardRef.current || !reptile) return;

    setSavingImage(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const safeName = reptile.name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `CareCard_${safeName}_${dateStr}.png`;

      await shareImage(dataUrl, fileName, `${reptile.name} Care Card`);
      toast.success('Care card image saved');
      setSavedJustNow(true);
      setTimeout(() => setSavedJustNow(false), 1500);
    } catch (error) {
      console.error('Failed to save care card image:', error);
      toast.error('Failed to save image');
    } finally {
      setSavingImage(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingTasks = schedule
    .filter(s => s.nextDueDate >= today)
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
    .slice(0, 4);

  if (loading || !reptile) {
    return (
      <div className="min-h-screen bg-background page-content page-content-top">
        <ContentSkeleton />
      </div>
    );
  }

  return (
    <PageMotion className="min-h-screen bg-background p-4 sm:p-5">
      {/* Top bar — premium share actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="min-h-[44px] transition-all duration-200 ease-out active:scale-[0.98]">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="min-h-[44px] transition-all duration-200 ease-out active:scale-[0.98] shadow-[var(--shadow-card)]">
            <Copy className="w-4 h-4 mr-1" />
            {usingPublicLink ? 'Copy Public Link' : 'Copy Local Link'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveImage} disabled={savingImage} className="min-h-[44px] transition-all duration-200 ease-out active:scale-[0.98] shadow-[var(--shadow-card)] data-[state=saved]:border-primary/50">
            {savedJustNow ? <Check className="w-4 h-4 mr-1 text-primary" /> : <ImageIcon className="w-4 h-4 mr-1" />}
            {savingImage ? 'Saving…' : savedJustNow ? 'Saved' : 'Save Image'}
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto mb-4">
        <PublicShareControls
          reptileId={reptile.id}
          shareType="care-card"
          label="Care card"
          localUpdatedAt={reptile.updatedAt}
          onRecordChange={setPublicRecord}
        />
      </div>

      {/* Shareable card — premium reveal */}
      <div
        ref={cardRef}
        className="max-w-md mx-auto premium-surface-elevated border border-border/50 rounded-[1.25rem] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-primary px-5 py-5 sm:py-6 text-primary-foreground">
          <h1 className="text-xl font-bold tracking-tight">{reptile.name}</h1>
          <p className="text-sm opacity-90 mt-0.5">
            {reptile.commonName || reptile.species}
            {reptile.morph ? ` • ${reptile.morph}` : ''}
          </p>
        </div>

        {/* Details */}
        <div className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Sex</span>
              <p className="font-medium">{SEX_LABELS[reptile.sex]}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Diet</span>
              <p className="font-medium">{DIET_LABELS[reptile.dietType] ?? reptile.dietType}</p>
            </div>
            {reptile.birthDate && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Birth</span>
                <p className="font-medium">{format(new Date(reptile.birthDate), 'MMM d, yyyy')}</p>
              </div>
            )}
            {reptile.estimatedAgeMonths && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">Age</span>
                <p className="font-medium">{reptile.estimatedAgeMonths} months</p>
              </div>
            )}
          </div>

          {/* Last feeding */}
          {lastFeeding && (
            <div className="pt-3 border-t border-border">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Last Feeding</span>
              <p className="font-medium text-sm">
                {format(new Date(lastFeeding.eventDate), 'MMM d, yyyy')}
                {lastFeeding.details ? ` — ${lastFeeding.details}` : ''}
              </p>
            </div>
          )}

          {/* Upcoming tasks */}
          {upcomingTasks.length > 0 && (
            <div className="pt-3 border-t border-border">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Upcoming Tasks</span>
              <div className="mt-1 space-y-1">
                {upcomingTasks.map(t => (
                  <div key={t.id} className="flex justify-between text-sm">
                    <span className="font-medium">{TASK_LABELS[t.taskType]}</span>
                    <span className="text-muted-foreground">{format(new Date(t.nextDueDate), 'MMM d')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes excerpt */}
          {reptile.notes && (
            <div className="pt-3 border-t border-border">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Notes</span>
              <p className="text-sm mt-1 line-clamp-3">{reptile.notes}</p>
            </div>
          )}

          {/* QR code + footer — premium framing */}
          <motion.div
            className="pt-5 border-t border-border/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12, duration: 0.22 }}
          >
            <div className="glass-panel rounded-[var(--radius-xl)] p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {usingPublicLink ? 'Scan public care card' : 'Scan local care card'}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">Powered by Reptilita</p>
              </div>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="Care card QR code" className="w-24 h-24 shrink-0 rounded-xl border border-border/50 shadow-[var(--shadow-card)]" />
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Clipboard Fallback Dialog */}
      <Dialog open={fallbackDialogOpen} onOpenChange={setFallbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Link Manually</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Automatic copy failed. Select and copy the URL below:
          </p>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm break-all font-mono select-all">{fallbackUrl}</p>
          </div>
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => {
              // Try once more
              navigator.clipboard?.writeText(fallbackUrl).then(
                () => {
                  toast.success('Link copied');
                  setFallbackDialogOpen(false);
                },
                () => toast.error('Please select and copy manually'),
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
