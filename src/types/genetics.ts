// Advanced Genetics Types for Reptile AI

export type InheritanceMode = 'dominant' | 'codominant' | 'recessive';

export type DominantState = 'visual' | 'none';
export type RecessiveState = 'visual' | 'het' | 'pos_het_66' | 'pos_het_50' | 'none';
export type GeneState = DominantState | RecessiveState;

export interface GeneticGene {
  name: string;
  mode: InheritanceMode;
  state: GeneState;
}

export interface GeneOutcome {
  name: string;
  mode: InheritanceMode;
  state: 'super' | 'visual' | 'het' | 'none';
}

export interface CombinedOutcome {
  label: string;
  percentage: number;
  visuals: string[];
  hets: string[];
  supers: string[];
}

export const INHERITANCE_MODE_OPTIONS: { value: InheritanceMode; label: string }[] = [
  { value: 'dominant', label: 'Dominant' },
  { value: 'codominant', label: 'Codominant' },
  { value: 'recessive', label: 'Recessive' },
];

export const DOMINANT_STATE_OPTIONS: { value: DominantState; label: string }[] = [
  { value: 'visual', label: 'Visual' },
  { value: 'none', label: 'None' },
];

export const RECESSIVE_STATE_OPTIONS: { value: RecessiveState; label: string }[] = [
  { value: 'visual', label: 'Visual' },
  { value: 'het', label: 'Het (100%)' },
  { value: 'pos_het_66', label: 'Pos Het (66%)' },
  { value: 'pos_het_50', label: 'Pos Het (50%)' },
  { value: 'none', label: 'None' },
];

export function getStateOptionsForMode(mode: InheritanceMode) {
  if (mode === 'recessive') {
    return RECESSIVE_STATE_OPTIONS;
  }
  return DOMINANT_STATE_OPTIONS;
}

export function formatGeneState(gene: GeneticGene): string {
  const name = gene.name;
  if (gene.state === 'none') return '';
  if (gene.state === 'visual') return name;
  if (gene.state === 'het') return `het ${name}`;
  if (gene.state === 'pos_het_66') return `66% het ${name}`;
  if (gene.state === 'pos_het_50') return `50% het ${name}`;
  return name;
}
