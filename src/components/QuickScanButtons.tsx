// Quick Scan buttons component
import { Button } from '@/components/ui/button';
import { QUICK_SCANS } from '@/lib/ai/quickScans';

interface QuickScanButtonsProps {
  onScan: (prompt: string) => void;
  disabled: boolean;
}

export function QuickScanButtons({ onScan, disabled }: QuickScanButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_SCANS.map((scan) => (
        <Button
          key={scan.id}
          variant="outline"
          size="sm"
          onClick={() => onScan(scan.prompt)}
          disabled={disabled}
          className="text-xs"
        >
          <span className="mr-1">{scan.emoji}</span>
          {scan.label}
        </Button>
      ))}
    </div>
  );
}
