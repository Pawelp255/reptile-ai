import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calculator, Info, Dna, Download, BarChart3, FlaskConical, Egg } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAllReptiles } from '@/lib/storage';
import { calculateAdvancedGenetics, groupOutcomes } from '@/lib/genetics/advancedCalculator';
import { toast } from 'sonner';
import type { Reptile } from '@/types';
import type { CombinedOutcome, GeneticGene } from '@/types/genetics';
import { formatGeneState } from '@/types/genetics';

interface BasicGeneticsResult {
  trait: string;
  outcomes: { label: string; percentage: number }[];
}

function parseTraits(morph: string | undefined): string[] {
  if (!morph) return [];
  return morph.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
}

function calculateBasicGenetics(parentA: Reptile, parentB: Reptile): BasicGeneticsResult[] {
  const results: BasicGeneticsResult[] = [];
  const traitsA = parseTraits(parentA.morph);
  const traitsB = parseTraits(parentB.morph);
  const hetsA = (parentA.hets || []).map(h => h.toLowerCase());
  const hetsB = (parentB.hets || []).map(h => h.toLowerCase());
  const allTraits = new Set([...traitsA, ...traitsB]);
  const allHets = new Set([...hetsA, ...hetsB]);

  allTraits.forEach(trait => {
    const inA = traitsA.includes(trait);
    const inB = traitsB.includes(trait);
    if (inA && inB) {
      results.push({ trait: trait.charAt(0).toUpperCase() + trait.slice(1), outcomes: [{ label: 'Visual', percentage: 75 }, { label: 'Normal', percentage: 25 }] });
    } else {
      results.push({ trait: trait.charAt(0).toUpperCase() + trait.slice(1), outcomes: [{ label: 'Visual', percentage: 50 }, { label: 'Normal', percentage: 50 }] });
    }
  });

  allHets.forEach(het => {
    const hetInA = hetsA.includes(het);
    const hetInB = hetsB.includes(het);
    const visualInA = traitsA.includes(het);
    const visualInB = traitsB.includes(het);
    if (visualInA || visualInB) return;
    const hetName = het.charAt(0).toUpperCase() + het.slice(1);
    if (hetInA && hetInB) {
      results.push({ trait: hetName + ' (recessive)', outcomes: [{ label: 'Visual', percentage: 25 }, { label: 'Het', percentage: 50 }, { label: 'Normal', percentage: 25 }] });
    } else if (hetInA || hetInB) {
      results.push({ trait: hetName + ' (recessive)', outcomes: [{ label: 'Het', percentage: 50 }, { label: 'Normal', percentage: 50 }] });
    }
  });

  return results;
}

// Species-based clutch size estimates
const CLUTCH_ESTIMATES: Record<string, { min: number; max: number; avg: number }> = {
  'ball python': { min: 3, max: 11, avg: 6 },
  'corn snake': { min: 8, max: 30, avg: 14 },
  'leopard gecko': { min: 1, max: 2, avg: 2 },
  'crested gecko': { min: 1, max: 2, avg: 2 },
  'bearded dragon': { min: 15, max: 30, avg: 20 },
  'boa constrictor': { min: 10, max: 65, avg: 25 },
  'king snake': { min: 5, max: 24, avg: 10 },
  'carpet python': { min: 10, max: 50, avg: 20 },
  'reticulated python': { min: 15, max: 80, avg: 35 },
  'hognose': { min: 4, max: 25, avg: 12 },
};

function getClutchEstimate(species: string): { min: number; max: number; avg: number } | null {
  const lower = species.toLowerCase();
  for (const [key, val] of Object.entries(CLUTCH_ESTIMATES)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function formatGeneDisplay(gene: GeneticGene): string {
  return formatGeneState(gene);
}

// Outcome bar color based on category
function getOutcomeColor(outcome: CombinedOutcome): { bg: string; text: string; bar: string } {
  if (outcome.supers.length > 0) return { bg: 'bg-accent/10', text: 'text-accent-foreground', bar: 'bg-accent' };
  if (outcome.visuals.length > 0) return { bg: 'bg-success/10', text: 'text-success', bar: 'bg-success' };
  if (outcome.hets.length > 0) return { bg: 'bg-primary/10', text: 'text-primary', bar: 'bg-primary' };
  return { bg: 'bg-muted', text: 'text-muted-foreground', bar: 'bg-muted-foreground' };
}

export default function GeneticsCalculatorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [reptiles, setReptiles] = useState<Reptile[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentAId, setParentAId] = useState<string>('');
  const [parentBId, setParentBId] = useState<string>('');
  const [advancedMode, setAdvancedMode] = useState(true);
  const [usingAdvanced, setUsingAdvanced] = useState(false);
  const [clutchSize, setClutchSize] = useState<number>(6);
  const [animated, setAnimated] = useState(false);

  const [advancedResults, setAdvancedResults] = useState<CombinedOutcome[]>([]);
  const [basicResults, setBasicResults] = useState<BasicGeneticsResult[]>([]);

  useEffect(() => {
    const loadReptiles = async () => {
      try {
        const allReptiles = await getAllReptiles();
        setReptiles(allReptiles);
        const paramA = searchParams.get('parentA');
        const paramB = searchParams.get('parentB');
        if (paramA && allReptiles.some(r => r.id === paramA)) setParentAId(paramA);
        if (paramB && allReptiles.some(r => r.id === paramB)) setParentBId(paramB);
      } catch (error) {
        console.error('Failed to load reptiles:', error);
      } finally {
        setLoading(false);
      }
    };
    loadReptiles();
  }, [searchParams]);

  useEffect(() => {
    if (parentAId && parentBId && parentAId !== parentBId) {
      const parentA = reptiles.find(r => r.id === parentAId);
      const parentB = reptiles.find(r => r.id === parentBId);
      if (parentA && parentB) {
        // Update clutch size based on species
        const estimate = getClutchEstimate(parentA.species || '') || getClutchEstimate(parentB.species || '');
        if (estimate) setClutchSize(estimate.avg);

        const hasAdvancedGenesA = parentA.genes && parentA.genes.length > 0;
        const hasAdvancedGenesB = parentB.genes && parentB.genes.length > 0;
        if (advancedMode && (hasAdvancedGenesA || hasAdvancedGenesB)) {
          const results = calculateAdvancedGenetics(parentA.genes || [], parentB.genes || []);
          setAdvancedResults(results);
          setBasicResults([]);
          setUsingAdvanced(true);
        } else {
          const results = calculateBasicGenetics(parentA, parentB);
          setBasicResults(results);
          setAdvancedResults([]);
          setUsingAdvanced(false);
        }
        // Trigger animation
        setAnimated(false);
        setTimeout(() => setAnimated(true), 50);
      }
    } else {
      setAdvancedResults([]);
      setBasicResults([]);
      setUsingAdvanced(false);
    }
  }, [parentAId, parentBId, reptiles, advancedMode]);

  const parentA = reptiles.find(r => r.id === parentAId);
  const parentB = reptiles.find(r => r.id === parentBId);
  const availableForB = reptiles.filter(r => r.id !== parentAId);
  const groupedResults = usingAdvanced ? groupOutcomes(advancedResults) : null;
  const hasResults = (usingAdvanced && advancedResults.length > 0) || (!usingAdvanced && basicResults.length > 0);

  const handleExport = () => {
    if (!hasResults || !parentA || !parentB) return;
    const lines: string[] = [
      'Genetics Calculator Results',
      `Date: ${new Date().toLocaleDateString()}`,
      `Parent A: ${parentA.name} (${parentA.morph || 'Normal'})`,
      `Parent B: ${parentB.name} (${parentB.morph || 'Normal'})`,
      `Mode: ${usingAdvanced ? 'Advanced' : 'Basic'}`,
      `Estimated Clutch Size: ${clutchSize}`,
      '',
      'Predicted Outcomes:',
    ];

    if (usingAdvanced) {
      advancedResults.forEach(o => {
        const count = Math.round((o.percentage / 100) * clutchSize);
        lines.push(`  ${o.label}: ${o.percentage.toFixed(1)}% (~${count} of ${clutchSize})`);
      });
    } else {
      basicResults.forEach(r => {
        lines.push(`  ${r.trait}:`);
        r.outcomes.forEach(o => lines.push(`    ${o.label}: ${o.percentage}%`));
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genetics_${parentA.name}_x_${parentB.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Results exported!');
  };

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Genetics Calculator" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Genetics Calculator"
        subtitle={usingAdvanced ? 'Advanced Mendelian predictions' : 'Basic trait predictions'}
        rightContent={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        }
      />

      <div className="p-4 space-y-5 max-w-2xl mx-auto">
        {/* Header Controls Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-border flex-1">
            <Dna className="w-5 h-5 text-primary shrink-0" />
            <span className="font-medium text-sm">Advanced Mode</span>
            <Switch checked={advancedMode} onCheckedChange={setAdvancedMode} className="ml-auto" />
          </div>
          {hasResults && (
            <Button variant="outline" size="sm" onClick={handleExport} className="shrink-0 h-[46px]">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex gap-3">
          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {usingAdvanced
              ? 'Assumes standard Mendelian inheritance. Real outcomes may vary by species and gene interactions.'
              : advancedMode
                ? 'No advanced genetics data found. Add genes via Edit Animal for better predictions.'
                : 'Simplified genetics. Enable Advanced Mode for multi-gene predictions.'}
          </p>
        </div>

        {/* Parent Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Parent A */}
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">♂</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Parent A</p>
                <p className="text-sm font-semibold">{parentA?.name || 'Select...'}</p>
              </div>
            </div>
            <Select value={parentAId} onValueChange={setParentAId}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent A" />
              </SelectTrigger>
              <SelectContent>
                {reptiles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {r.genes?.length ? `${r.genes.length} genes` : r.morph || 'Normal'}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {parentA && (
              <div className="pt-1 space-y-0.5">
                {parentA.species && <p className="text-xs text-muted-foreground">{parentA.species}</p>}
                {parentA.genes && parentA.genes.length > 0 ? (
                  parentA.genes.filter(g => g.state !== 'none').map((gene, i) => (
                    <span key={i} className="inline-block text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full mr-1 mb-1">
                      {formatGeneDisplay(gene)}
                    </span>
                  ))
                ) : (
                  <>
                    {parentA.morph && <p className="text-xs text-muted-foreground">{parentA.morph}</p>}
                    {parentA.hets && parentA.hets.length > 0 && (
                      <p className="text-xs text-muted-foreground">Het: {parentA.hets.join(', ')}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Parent B */}
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <span className="text-xs font-bold text-destructive">♀</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Parent B</p>
                <p className="text-sm font-semibold">{parentB?.name || 'Select...'}</p>
              </div>
            </div>
            <Select value={parentBId} onValueChange={setParentBId}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent B" />
              </SelectTrigger>
              <SelectContent>
                {availableForB.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {r.genes?.length ? `${r.genes.length} genes` : r.morph || 'Normal'}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {parentB && (
              <div className="pt-1 space-y-0.5">
                {parentB.species && <p className="text-xs text-muted-foreground">{parentB.species}</p>}
                {parentB.genes && parentB.genes.length > 0 ? (
                  parentB.genes.filter(g => g.state !== 'none').map((gene, i) => (
                    <span key={i} className="inline-block text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full mr-1 mb-1">
                      {formatGeneDisplay(gene)}
                    </span>
                  ))
                ) : (
                  <>
                    {parentB.morph && <p className="text-xs text-muted-foreground">{parentB.morph}</p>}
                    {parentB.hets && parentB.hets.length > 0 && (
                      <p className="text-xs text-muted-foreground">Het: {parentB.hets.join(', ')}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Clutch Size Estimator */}
        {hasResults && parentA && parentB && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Egg className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold">Clutch Size Estimator</h3>
            </div>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={1}
                max={100}
                value={clutchSize}
                onChange={(e) => setClutchSize(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 h-9 text-center"
              />
              <p className="text-xs text-muted-foreground flex-1">
                {(() => {
                  const est = getClutchEstimate(parentA.species || '') || getClutchEstimate(parentB.species || '');
                  return est
                    ? `Typical for species: ${est.min}–${est.max} (avg ${est.avg})`
                    : 'Enter expected clutch size to see per-outcome counts';
                })()}
              </p>
            </div>
          </div>
        )}

        {/* Advanced Results with Animated Bars */}
        {usingAdvanced && groupedResults && advancedResults.length > 0 && (
          <div ref={resultsRef} className="bg-card rounded-xl p-4 border border-border space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold">Predicted Offspring Outcomes</h3>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-success/10 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-success">{groupedResults.visuals.length}</p>
                <p className="text-xs text-muted-foreground">Visual</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-primary">{groupedResults.carriers.length}</p>
                <p className="text-xs text-muted-foreground">Carrier</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-muted-foreground">{groupedResults.normals.length}</p>
                <p className="text-xs text-muted-foreground">Normal</p>
              </div>
            </div>

            {/* All outcomes with animated bars */}
            <div className="space-y-2">
              {advancedResults.map((outcome, index) => {
                const colors = getOutcomeColor(outcome);
                const expectedCount = Math.round((outcome.percentage / 100) * clutchSize);
                return (
                  <div key={index} className={`p-3 rounded-lg ${colors.bg} transition-all duration-300`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm truncate pr-2">{outcome.label}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">~{expectedCount}/{clutchSize}</span>
                        <span className={`text-sm font-bold ${colors.text}`}>
                          {outcome.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.bar} transition-all duration-700 ease-out`}
                        style={{ width: animated ? `${outcome.percentage}%` : '0%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Basic Results with Animated Bars */}
        {!usingAdvanced && basicResults.length > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border space-y-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold">Predicted Outcomes (Per Trait)</h3>
            </div>

            <div className="space-y-4">
              {basicResults.map((result, index) => (
                <div key={index} className="p-3 bg-secondary/30 rounded-lg">
                  <p className="font-medium text-sm mb-2">{result.trait}</p>
                  <div className="space-y-1.5">
                    {result.outcomes.map((outcome, oi) => (
                      <div key={oi} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{outcome.label}</span>
                          <span className="font-medium">{outcome.percentage}%</span>
                        </div>
                        <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                            style={{ width: animated ? `${outcome.percentage}%` : '0%' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Punnett Square Preview (for simple single-gene) */}
        {usingAdvanced && advancedResults.length > 0 && advancedResults.length <= 4 && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold">Probability Distribution</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {advancedResults.slice(0, 8).map((outcome, i) => {
                const colors = getOutcomeColor(outcome);
                return (
                  <div key={i} className={`${colors.bg} rounded-lg p-3 text-center transition-all duration-300 hover:scale-105`}>
                    <p className={`text-xl font-bold ${colors.text}`}>{outcome.percentage.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate" title={outcome.label}>
                      {outcome.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ~{Math.round((outcome.percentage / 100) * clutchSize)} eggs
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty States */}
        {parentAId && parentBId && parentAId !== parentBId && !hasResults && (
          <div className="bg-card rounded-xl p-8 border border-border text-center">
            <FlaskConical className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">
              No traits detected. Add genetics information via Edit Animal.
            </p>
          </div>
        )}

        {(!parentAId || !parentBId) && (
          <div className="bg-card rounded-xl p-8 border border-border text-center">
            <Dna className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium text-foreground mb-1">Select Parents</p>
            <p className="text-muted-foreground text-sm">
              Choose two parents above to calculate predicted offspring genetics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
