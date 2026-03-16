import { PageHeader } from '@/components/PageHeader';
import { PageMotion } from '@/components/motion/PageMotion';
import { PhotoHealthCheck } from '@/components/health/PhotoHealthCheck';

export default function HealthCheckPage() {
  return (
    <PageMotion className="page-container">
      <PageHeader title="Photo Health Check" subtitle="AI-powered visual analysis" />
      <div className="page-content page-content-top">
        <PhotoHealthCheck />
      </div>
    </PageMotion>
  );
}
