import { PageHeader } from '@/components/PageHeader';
import { PageMotion } from '@/components/motion/PageMotion';
import { Sparkles } from 'lucide-react';
import { PhotoHealthCheck } from '@/components/health/PhotoHealthCheck';

export default function HealthCheckPage() {
  return (
    <PageMotion className="page-container">
      <PageHeader title="Photo Health Check" subtitle="Preview visual analysis" />
      <div className="page-content page-content-top space-y-3">
        <div className="premium-surface rounded-[var(--radius-xl)] p-3 sm:p-4 border border-warning/25">
          <div className="flex items-center gap-2 text-warning">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">Preview / Coming soon</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Local-first: data stored on this device.
          </p>
        </div>
        <PhotoHealthCheck />
      </div>
    </PageMotion>
  );
}
