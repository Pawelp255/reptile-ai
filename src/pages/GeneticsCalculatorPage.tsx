import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  Info,
  Dna,
  Download,
  BarChart3,
  FlaskConical,
  Egg,
  Heart,
  UserPlus,
  X,
  BookOpen,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { getAllReptiles, createPairing, getToday, getAllPairings } from '@/lib/storage';
import { calculateAdvancedGenetics, groupOutcomes } from '@/lib/genetics/advancedCalculator';
import { toast } from 'sonner';
import type { Reptile, Sex } from '@/types';
import type { CombinedOutcome, GeneticGene } from '@/types/genetics';
import { formatGeneState } from '@/types/genetics';
import { cn } from '@/lib/utils';

interface BasicGeneticsResult {
  trait: string;
  outcomes: { label: string; percentage: number }[];
}

function parseTraits(morph: string | undefined): string[] {
  if (!morph) return [];
  return morph.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
}

function calculateBasicGenetics(parentA: Reptile, parentB: Reptile): BasicGeneticsResult[] {
  const results: BasicGeneticsResult[] = [];
  const traitsA = parseTraits(parentA.morph);
  const traitsB = parseTraits(parentB.morph);
  const hetsA = (parentA.hets || []).map((h) => h.toLowerCase());
  const hetsB = (parentB.hets || []).map((h) => h.toLowerCase());
  const allTraits = new Set([...traitsA, ...traitsB]);
  const allHets = new Set([...hetsA, ...hetsB]);

  allTraits.forEach((trait) => {
    const inA = traitsA.includes(trait);
    const inB = traitsB.includes(trait);
    if (inA && inB) {
      results.push({
        trait: trait.charAt(0).toUpperCase() + trait.slice(1),
        outcomes: [
          { label: 'Visual', percentage: 75 },
          { label: 'Normal', percentage: 25 },
        ],
      });
    } else {
      results.push({
        trait: trait.charAt(0).toUpperCase() + trait.slice(1),
        outcomes: [
          { label: 'Visual', percentage: 50 },
          { label: 'Normal', percentage: 50 },
        ],
      });
    }
  });

  allHets.forEach((het) => {
    const hetInA = hetsA.includes(het);
    const hetInB = hetsB.includes(het);
    const visualInA = traitsA.includes(het);
    const visualInB = traitsB.includes(het);
    if (visualInA || visualInB) return;
    const hetName = het.charAt(0).toUpperCase() + het.slice(1);
    if (hetInA && hetInB) {
      results.push({
        trait: `${hetName} (recessive)`,
        outcomes: [
          { label: 'Visual', percentage: 25 },
          { label: 'Het', percentage: 50 },
          { label: 'Normal', percentage: 25 },
        ],
      });
    } else if (hetInA || hetInB) {
      results.push({
        trait: `${hetName} (recessive)`,
        outcomes: [
          { label: 'Het', percentage: 50 },
          { label: 'Normal', percentage: 50 },
        ],
      });
    }
  });

  return results;
}

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
  hognose: { min: 4, max: 25, avg: 12 },
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

function formatSexLabel(sex: Sex): string {
  if (sex === 'male') return 'Male';
  if (sex === 'female') return 'Female';
  return 'Sex unknown';
}

/** Non-placeholder structured genes (drives advanced path). */
function getActiveStructuredGenes(r: Reptile): GeneticGene[] {
  return (r.genes || []).filter((g) => g.state !== 'none');
}

function reptileUsesAdvancedPrediction(r: Reptile): boolean {
  return getActiveStructuredGenes(r).length > 0;
}

function outcomeColorClasses(outcome: CombinedOutcome): { bg: string; text: string; bar: string } {
  if (outcome.supers.length > 0) return { bg: 'bg-accent/10', text: 'text-accent-foreground', bar: 'bg-accent' };
  if (outcome.visuals.length > 0) return { bg: 'bg-success/10', text: 'text-success', bar: 'bg-success' };
  if (outcome.hets.length > 0) return { bg: 'bg-primary/10', text: 'text-primary', bar: 'bg-primary' };
  return { bg: 'bg-muted', text: 'text-muted-foreground', bar: 'bg-muted-foreground' };
}

type PickerSlot = 'A' | 'B';

function pairingExistsForParents(
  pairings: Awaited<ReturnType<typeof getAllPairings>>,
  parentAId: string,
  parentBId: string,
) {
  return pairings.some(
    (p) =>
      (p.parentAId === parentAId && p.parentBId === parentBId) ||
      (p.parentAId === parentBId && p.parentBId === parentAId),
  );
}

export default function GeneticsCalculatorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);

  const [reptiles, setReptiles] = useState<Reptile[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentAId, setParentAId] = useState<string>('');
  const [parentBId, setParentBId] = useState<string>('');
  const [usingAdvanced, setUsingAdvanced] = useState(false);
  const [clutchSize, setClutchSize] = useState<number>(6);
  const [animated, setAnimated] = useState(false);

  const [advancedResults, setAdvancedResults] = useState<CombinedOutcome[]>([]);
  const [basicResults, setBasicResults] = useState<BasicGeneticsResult[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<PickerSlot | null>(null);
  const [savingPairing, setSavingPairing] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);

  const parentA = reptiles.find((r) => r.id === parentAId);
  const parentB = reptiles.find((r) => r.id === parentBId);

  const reptilesForPicker = useMemo(() => {
    if (pickerSlot === 'A') return reptiles.filter((r) => r.id !== parentBId);
    if (pickerSlot === 'B') return reptiles.filter((r) => r.id !== parentAId);
    return reptiles;
  }, [pickerSlot, reptiles, parentAId, parentBId]);

  const openPicker = (slot: PickerSlot) => {
    setPickerSlot(slot);
    setPickerOpen(true);
  };

  const handlePickReptile = (id: string) => {
    if (pickerSlot === 'A') setParentAId(id);
    if (pickerSlot === 'B') setParentBId(id);
    setPickerOpen(false);
    setPickerSlot(null);
  };

  const pairSummaryText = useMemo(() => {
    if (!parentA || !parentB) return [];

    const lines: string[] = [];
    const pushGeneChipsDescription = (label: string, genes: GeneticGene[]) => {
      const active = genes.filter((g) => g.state !== 'none');
      if (active.length === 0) return;
      lines.push(`${label}: ${active.map(formatGeneDisplay).filter(Boolean).join(', ')}`);
    };

    pushGeneChipsDescription('Parent A (structured)', parentA.genes || []);
    pushGeneChipsDescription('Parent B (structured)', parentB.genes || []);

    if (parentA.morph?.trim()) lines.push(`Parent A morph (text): ${parentA.morph.trim()}`);
    if (parentB.morph?.trim()) lines.push(`Parent B morph (text): ${parentB.morph.trim()}`);
    const ha = parentA.hets?.length ? parentA.hets.join(', ') : '';
    const hb = parentB.hets?.length ? parentB.hets.join(', ') : '';
    if (ha) lines.push(`Parent A hets (text): ${ha}`);
    if (hb) lines.push(`Parent B hets (text): ${hb}`);

    const names = new Set<string>();
    for (const r of [parentA, parentB]) {
      for (const g of getActiveStructuredGenes(r)) {
        names.add(g.name.trim());
      }
    }
    if (usingAdvanced) {
      if (names.size > 0) {
        lines.push(`Loci modeled in Mendelian calculator: ${[...names].sort().join(', ')}`);
      }
      const aTextOnly = !reptileUsesAdvancedPrediction(parentA) && !!(parentA.morph?.trim() || parentA.hets?.length);
      const bTextOnly = !reptileUsesAdvancedPrediction(parentB) && !!(parentB.morph?.trim() || parentB.hets?.length);
      if (aTextOnly || bTextOnly) {
        lines.push(
          'Note: Morph/het text on a parent without structured genes does not participate in advanced math yet—edit the animal and add modeled genes for those traits.',
        );
      }
    } else {
      const traitNames = new Set<string>();
      for (const r of [parentA, parentB]) {
        parseTraits(r.morph).forEach((t) => traitNames.add(t.charAt(0).toUpperCase() + t.slice(1)));
        for (const h of r.hets || []) {
          traitNames.add(`${h} (het)`);
        }
      }
      if (traitNames.size > 0) {
        lines.push(`Text traits summarized for basic prediction: ${[...traitNames].sort().join(', ')}`);
      }
    }

    return lines;
  }, [parentA, parentB, usingAdvanced]);

  useEffect(() => {
    const loadReptiles = async () => {
      try {
        const allReptiles = await getAllReptiles();
        setReptiles(allReptiles);
        const paramA = searchParams.get('parentA');
        const paramB = searchParams.get('parentB');
        if (paramA && allReptiles.some((r) => r.id === paramA)) setParentAId(paramA);
        if (paramB && allReptiles.some((r) => r.id === paramB)) setParentBId(paramB);
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
      const pa = reptiles.find((r) => r.id === parentAId);
      const pb = reptiles.find((r) => r.id === parentBId);
      if (pa && pb) {
        const estimate = getClutchEstimate(pa.species || '') || getClutchEstimate(pb.species || '');
        if (estimate) setClutchSize(estimate.avg);

        const useAdv = reptileUsesAdvancedPrediction(pa) || reptileUsesAdvancedPrediction(pb);
        if (useAdv) {
          const results = calculateAdvancedGenetics(pa.genes || [], pb.genes || []);
          setAdvancedResults(results);
          setBasicResults([]);
          setUsingAdvanced(true);
        } else {
          const results = calculateBasicGenetics(pa, pb);
          setBasicResults(results);
          setAdvancedResults([]);
          setUsingAdvanced(false);
        }
        setAnimated(false);
        setTimeout(() => setAnimated(true), 50);
      }
    } else {
      setAdvancedResults([]);
      setBasicResults([]);
      setUsingAdvanced(false);
    }
  }, [parentAId, parentBId, reptiles]);

  const groupedResults = usingAdvanced ? groupOutcomes(advancedResults) : null;
  const hasResults =
    (usingAdvanced && advancedResults.length > 0) || (!usingAdvanced && basicResults.length > 0);

  const subtitle = usingAdvanced
    ? 'Advanced Mendelian predictions (when structured genes exist)'
    : 'Basic morph / het heuristic';

  const handleExport = () => {
    if (!hasResults || !parentA || !parentB) return;
    const lines: string[] = [
      'Genetics Calculator Results',
      `Date: ${new Date().toLocaleDateString()}`,
      `Parent A: ${parentA.name} (${parentA.morph || 'Normal'})`,
      `Parent B: ${parentB.name} (${parentB.morph || 'Normal'})`,
      `Prediction path: ${usingAdvanced ? 'Advanced (structured genes)' : 'Basic (text morph & hets)'}`,
      `Estimated Clutch Size: ${clutchSize}`,
      '',
      'Detected traits (summary):',
      ...pairSummaryText.map((l) => `  ${l}`),
      '',
      'How this was calculated:',
      usingAdvanced
        ? [
            '  Matched genes by name across parents; modeled dominant, codominant, and recessive modes from each gene.',
            '  Combined probabilities across loci assuming independence.',
            '  Morph/het-only text excluded unless converted to modeled genes.',
          ].join('\n')
        : [
            '  Parsed comma-separated morph labels and typed het lists from each animal.',
            '  Applied coarse template percentages per trait—not lineage-specific genetics.',
          ].join('\n'),
      '',
      'Predicted Outcomes:',
    ];

    if (usingAdvanced) {
      advancedResults.forEach((o) => {
        const count = Math.round((o.percentage / 100) * clutchSize);
        lines.push(`  ${o.label}: ${o.percentage.toFixed(1)}% (~${count} of ${clutchSize})`);
      });
    } else {
      basicResults.forEach((r) => {
        lines.push(`  ${r.trait}:`);
        r.outcomes.forEach((o) => lines.push(`    ${o.label}: ${o.percentage}%`));
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

  const handleSavePairing = async () => {
    if (!parentA || !parentB || parentAId === parentBId) return;
    setSavingPairing(true);
    try {
      const existing = await getAllPairings();
      if (pairingExistsForParents(existing, parentAId, parentBId)) {
        toast.message('Pairing already exists', {
          description: 'This pair is saved in breeding. Open Breeding → Pairings to manage it.',
        });
        return;
      }
      const pairing = await createPairing({
        parentAId,
        parentBId,
        startDate: getToday(),
        status: 'planned',
        notes: 'Saved from Genetics Calculator',
      });
      toast.success('Pairing saved', { description: 'Opening pairing…' });
      navigate(`/breeding/pairings/${pairing.id}`);
    } catch (e) {
      console.error(e);
      toast.error('Could not save pairing');
    } finally {
      setSavingPairing(false);
    }
  };

  const renderGeneChips = (r: Reptile) => {
    const genes = getActiveStructuredGenes(r);
    if (genes.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {genes.map((gene, i) => (
          <span
            key={`${gene.name}-${gene.state}-${i}`}
            className="inline-block text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-full"
          >
            {formatGeneDisplay(gene) || gene.name}
          </span>
        ))}
      </div>
    );
  };

  function ParentPreviewCard(props: {
    slot: PickerSlot;
    reptile?: Reptile;
    badgeClass: string;
    badge: string;
  }) {
    const { slot, reptile, badgeClass, badge } = props;
    return (
      <div className="bg-card rounded-xl p-4 border border-border flex flex-col min-h-[160px]">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs',
              badgeClass,
            )}
          >
            {badge}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{slot === 'A' ? 'Parent A' : 'Parent B'}</p>
            {reptile ? (
              <>
                <p className="font-semibold text-sm truncate">{reptile.name}</p>
                {reptile.species ? (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{reptile.species}</p>
                ) : null}
                <p className="text-[11px] text-muted-foreground mt-1">{formatSexLabel(reptile.sex)}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No animal chosen</p>
            )}
          </div>
        </div>

        {reptile && (
          <div className="mt-3 space-y-1 flex-1">
            {getActiveStructuredGenes(reptile).length === 0 ? (
              <>
                {reptile.morph?.trim() ? (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground/80 font-medium">Morph: </span>
                    {reptile.morph}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Morph: none listed</p>
                )}
                {!!reptile.hets?.length && (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground/80 font-medium">Hets: </span>
                    {reptile.hets.join(', ')}
                  </p>
                )}
              </>
            ) : null}
            {renderGeneChips(reptile)}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4 mt-auto pt-3 border-t border-border/70">
          {reptile ? (
            <>
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => openPicker(slot)}>
                Change
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => (slot === 'A' ? setParentAId('') : setParentBId(''))}>
                <X className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
            </>
          ) : (
            <Button type="button" variant="default" size="sm" className="h-9 w-full sm:w-auto" onClick={() => openPicker(slot)}>
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Choose animal
            </Button>
          )}
        </div>
      </div>
    );
  }

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
        subtitle={subtitle}
        rightContent={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        }
      />

      <div className="p-4 space-y-5 max-w-2xl mx-auto">
        {/* Actions row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-2 bg-card rounded-xl px-3 py-2.5 border border-border flex-1 min-w-0">
            <FlaskConical className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {usingAdvanced
                ? 'Using advanced Mendelian combo because at least one parent has modeled genes.'
                : 'Both parents rely on morph/het text only—prediction uses simple templates.'}
            </span>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            {parentA && parentB && parentAId !== parentBId && (
              <Button variant="outline" size="sm" onClick={() => void handleSavePairing()} disabled={savingPairing}>
                <Heart className="w-4 h-4 mr-1.5" />
                {savingPairing ? 'Saving…' : 'Save as pairing'}
              </Button>
            )}
            {hasResults && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>

        <CommandDialog
          open={pickerOpen}
          onOpenChange={(open) => {
            setPickerOpen(open);
            if (!open) setPickerSlot(null);
          }}
        >
          <CommandInput placeholder="Search by name or species…" />
          <CommandList className="max-h-[52dvh] sm:max-h-[320px]">
            <CommandEmpty>No animals match.</CommandEmpty>
            <CommandGroup heading="Animals">
              {reptilesForPicker.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.name} ${r.species} ${r.morph ?? ''}`}
                  onSelect={() => handlePickReptile(r.id)}
                  className="flex flex-col items-start gap-0.5 py-3 cursor-pointer aria-selected:bg-accent"
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.species}
                    {getActiveStructuredGenes(r).length > 0
                      ? ` · ${getActiveStructuredGenes(r).length} modeled gene(s)`
                      : r.morph
                        ? ` · ${r.morph}`
                        : ''}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        {/* Disclaimer */}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex gap-3">
          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {usingAdvanced ? (
              <>
                Predictions assume textbook Mendelian rules and independence between loci. Real species and allelic
                interactions can differ—verify important pairings independently.
              </>
            ) : (
              <>
                Basic mode uses shorthand morph text and typed hets—not full genetics models. Add structured genes via{' '}
                <span className="text-foreground/90 font-medium">Edit Animal</span> whenever you need multi-gene math.
              </>
            )}
          </p>
        </div>

        {/* Parent cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ParentPreviewCard slot="A" reptile={parentA} badge="A" badgeClass="bg-primary/10 text-primary" />
          <ParentPreviewCard slot="B" reptile={parentB} badge="B" badgeClass="bg-destructive/10 text-destructive" />
        </div>

        {/* Pair-level trait summary */}
        {parentA && parentB && parentAId !== parentBId ? (
          <div className="bg-card rounded-xl p-4 border border-border space-y-2">
            <div className="flex items-center gap-2">
              <Dna className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Detected genes summary</h3>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
              {pairSummaryText.length === 0 ? (
                <li>No morph, het, or modeled genes detected for this pairing.</li>
              ) : (
                pairSummaryText.map((line) => <li key={line}>{line}</li>)
              )}
            </ul>
          </div>
        ) : null}

        {/* Clutch */}
        {hasResults && parentA && parentB && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Egg className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold">Clutch size estimator</h3>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Input
                type="number"
                min={1}
                max={100}
                value={clutchSize}
                onChange={(e) => setClutchSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 h-9 text-center"
              />
              <p className="text-xs text-muted-foreground flex-1 min-w-[140px]">
                {(() => {
                  const est = getClutchEstimate(parentA.species || '') || getClutchEstimate(parentB.species || '');
                  return est ? `Typical for species: ${est.min}–${est.max} (avg ${est.avg})` : 'Enter clutch size for per-outcome counts.';
                })()}
              </p>
            </div>
          </div>
        )}

        {/* Advanced */}
        {usingAdvanced && groupedResults && advancedResults.length > 0 && (
          <div ref={resultsRef} className="bg-card rounded-xl p-4 border border-border space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold">Predicted offspring outcomes</h3>
            </div>

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

            <div className="space-y-2">
              {advancedResults.map((outcome, index) => {
                const colors = outcomeColorClasses(outcome);
                const expectedCount = Math.round((outcome.percentage / 100) * clutchSize);
                return (
                  <div key={`${outcome.label}-${index}`} className={cn('p-3 rounded-lg transition-all duration-300', colors.bg)}>
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="font-medium text-sm truncate">{outcome.label}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          ~{expectedCount}/{clutchSize}
                        </span>
                        <span className={cn('text-sm font-bold', colors.text)}>{outcome.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700 ease-out', colors.bar)}
                        style={{ width: animated ? `${outcome.percentage}%` : '0%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Basic */}
        {!usingAdvanced && basicResults.length > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border space-y-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold">Predicted outcomes (per trait)</h3>
            </div>

            <div className="space-y-4">
              {basicResults.map((result, index) => (
                <div key={`${result.trait}-${index}`} className="p-3 bg-secondary/30 rounded-lg space-y-2">
                  <p className="font-medium text-sm">{result.trait}</p>
                  {result.outcomes.map((outcome, oi) => (
                    <div key={`${oi}-${outcome.label}`} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{outcome.label}</span>
                        <span className="font-medium">{outcome.percentage}%</span>
                      </div>
                      <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                          style={{ width: animated ? `${outcome.percentage}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {usingAdvanced && advancedResults.length > 0 && advancedResults.length <= 4 && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold">Probability snapshot</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {advancedResults.slice(0, 8).map((outcome, i) => {
                const colors = outcomeColorClasses(outcome);
                return (
                  <div
                    key={i}
                    className={cn(
                      `${colors.bg} rounded-lg p-3 text-center transition-all duration-300 hover:scale-[1.02]`,
                    )}
                  >
                    <p className={cn('text-xl font-bold', colors.text)}>{outcome.percentage.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate" title={outcome.label}>
                      {outcome.label}
                    </p>
                    <p className="text-xs text-muted-foreground">~{Math.round((outcome.percentage / 100) * clutchSize)} eggs</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Collapsible open={explainOpen} onOpenChange={setExplainOpen} className="bg-card rounded-xl border border-border">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium hover:bg-muted/30 rounded-xl">
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary shrink-0" />
              How this was calculated
            </span>
            <span className="text-xs text-muted-foreground shrink-0">{explainOpen ? 'Hide' : 'Show'}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 pt-0 text-xs text-muted-foreground space-y-2 border-t border-border/70">
            {usingAdvanced ? (
              <>
                <p>
                  Reptilita aligns each modeled gene across parents by <span className="text-foreground/90 font-medium">name</span>
                  , filling missing alleles as &quot;none&quot; when a parent does not define that trait.
                </p>
                <p>
                  Dominant traits use shared visual-vs-normal odds; codominant adds supers; recessive expands het and visual
                  pairings—including pos-hets as weighted branches when you record them per gene.
                </p>
                <p>
                  Final percentages multiply those single-gene results together, assuming loci behave independently (
                  <span className="text-foreground/90 font-medium">multiplicative Mendelian rollup</span>).
                </p>
              </>
            ) : (
              <>
                <p>
                  Morph strings are split on commas into tokens; overlapping tokens between parents get a higher visual-heavy
                  template; single-parent tokens sit at fifty-fifty in this simplified view.
                </p>
                <p>
                  Recessive hets list alongside morphs contributes separate rows with textbook het × het and het × normal style
                  odds—still a heuristic, not a substitute for pedigree work.
                </p>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        {parentAId && parentBId && parentAId !== parentBId && !hasResults && (
          <div className="bg-card rounded-xl p-8 border border-border text-center">
            <FlaskConical className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No recognizable traits came from morph, het lists, or modeled genes.</p>
          </div>
        )}

        {(!parentAId || !parentBId) && (
          <div className="bg-card rounded-xl p-8 border border-border text-center">
            <Dna className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium text-foreground mb-1">Pick two animals</p>
            <p className="text-muted-foreground text-sm">Use the parent cards above to forecast offspring percentages.</p>
          </div>
        )}
      </div>
    </div>
  );
}
