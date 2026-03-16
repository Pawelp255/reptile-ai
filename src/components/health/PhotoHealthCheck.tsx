import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StaggerList, StaggerItem } from '@/components/motion/StaggerList';

interface HealthFinding {
  issue: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

// Placeholder AI analysis — returns mock results
async function analyzePhoto(_imageDataUrl: string): Promise<HealthFinding[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Return placeholder findings
  return [
    {
      issue: 'Skin appears slightly dull',
      severity: 'low',
      suggestion: 'Could indicate upcoming shed cycle. Monitor for retained shed, especially around eyes and tail tip.',
    },
    {
      issue: 'Hydration check recommended',
      severity: 'medium',
      suggestion: 'Ensure fresh water is available and consider misting. Check skin turgor by gently pinching the skin.',
    },
  ];
}

const severityColors: Record<string, string> = {
  low: 'text-primary border-primary/30 bg-primary/5',
  medium: 'text-accent border-accent/30 bg-accent/5',
  high: 'text-destructive border-destructive/30 bg-destructive/5',
};

export function PhotoHealthCheck() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [findings, setFindings] = useState<HealthFinding[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
      setFindings([]);
      setAnalyzed(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageUrl) return;
    setAnalyzing(true);
    try {
      const results = await analyzePhoto(imageUrl);
      setFindings(results);
      setAnalyzed(true);
    } catch (err) {
      console.error('Photo analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload area — premium surface */}
      {!imageUrl ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full min-h-[140px] border-2 border-dashed border-border/60 rounded-[var(--radius-xl)] p-6 sm:p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/40 transition-all duration-200 active:scale-[0.995] glass-panel"
        >
          <Camera className="w-11 h-11" aria-hidden />
          <p className="text-sm font-medium">Take or upload a photo</p>
          <p className="text-xs">JPG, PNG — tap to select</p>
        </button>
      ) : (
        <div className="relative rounded-[var(--radius-xl)] overflow-hidden premium-surface animate-in-fade">
          <img src={imageUrl} alt="Reptile for analysis" className="w-full max-h-72 object-cover" />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-3 right-3 shadow-sm"
            onClick={() => { setImageUrl(null); setFindings([]); setAnalyzed(false); }}
          >
            Change
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {imageUrl && !analyzed && (
        <>
          <Button onClick={handleAnalyze} disabled={analyzing} className="w-full min-h-[48px]">
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                Analyzing…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Analyze photo
              </>
            )}
          </Button>
          {analyzing && (
            <div className="space-y-4 pt-1">
              <h3 className="section-header">Analysis results</h3>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Card key={i} className="p-4 border border-border rounded-[var(--radius-lg)] overflow-hidden">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-5 h-5 rounded shrink-0 mt-0.5 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 animate-pulse" />
                        <Skeleton className="h-3 w-full animate-pulse" />
                        <Skeleton className="h-3 w-1/2 animate-pulse" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Results — trust-building panel with reveal */}
      {findings.length > 0 && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h3 className="section-header mb-2">Analysis Results</h3>
          <StaggerList className="space-y-3">
            {findings.map((f, i) => (
              <StaggerItem key={i}>
              <Card className={`p-4 sm:p-5 border rounded-[var(--radius-lg)] premium-surface ${severityColors[f.severity]}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{f.issue}</p>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-snug">{f.suggestion}</p>
                    <span className="inline-block mt-2 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                      {f.severity} priority
                    </span>
                  </div>
                </div>
              </Card>
              </StaggerItem>
            ))}
          </StaggerList>
          <p className="text-xs text-muted-foreground text-center pt-1">
            Placeholder analysis. Always consult an exotic pet veterinarian for medical concerns.
          </p>
        </motion.div>
      )}

      {analyzed && findings.length === 0 && (
        <div className="empty-state py-10 px-4 text-center animate-in-fade">
          <div className="mb-4 text-primary/80">
            <CheckCircle2 className="w-14 h-14 sm:w-16 sm:h-16 mx-auto" />
          </div>
          <h3 className="text-[15px] font-semibold text-foreground mb-1.5">No issues detected</h3>
          <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">Nothing stood out in this photo. Always consult a vet for health concerns.</p>
        </div>
      )}
    </div>
  );
}
