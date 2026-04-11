// Advanced Genetics Calculator for Reptilita
// Implements Mendelian inheritance with dominant, codominant, and recessive genes

import type { GeneticGene, CombinedOutcome, GeneOutcome, InheritanceMode, GeneState } from '@/types/genetics';

interface GeneResult {
  name: string;
  mode: InheritanceMode;
  outcomes: { state: 'super' | 'visual' | 'het' | 'none'; probability: number }[];
}

// Expand pos-het states into weighted branches
function expandPosHet(state: GeneState): { realState: 'visual' | 'het' | 'none'; weight: number }[] {
  if (state === 'pos_het_66') {
    return [
      { realState: 'het', weight: 0.66 },
      { realState: 'none', weight: 0.34 },
    ];
  }
  if (state === 'pos_het_50') {
    return [
      { realState: 'het', weight: 0.50 },
      { realState: 'none', weight: 0.50 },
    ];
  }
  // Non-pos states map directly
  return [{ realState: state as 'visual' | 'het' | 'none', weight: 1 }];
}

// Calculate dominant outcomes
function calcDominant(stateA: 'visual' | 'none', stateB: 'visual' | 'none'): { state: 'visual' | 'none'; probability: number }[] {
  if (stateA === 'visual' && stateB === 'visual') {
    // Assuming heterozygous: 75% visual, 25% none
    return [
      { state: 'visual', probability: 0.75 },
      { state: 'none', probability: 0.25 },
    ];
  }
  if (stateA === 'visual' || stateB === 'visual') {
    // One visual: 50% visual, 50% none
    return [
      { state: 'visual', probability: 0.50 },
      { state: 'none', probability: 0.50 },
    ];
  }
  // Neither visual
  return [{ state: 'none', probability: 1 }];
}

// Calculate codominant outcomes (includes super form)
function calcCodominant(stateA: 'visual' | 'none', stateB: 'visual' | 'none'): { state: 'super' | 'visual' | 'none'; probability: number }[] {
  if (stateA === 'visual' && stateB === 'visual') {
    // Both visual: 25% super, 50% visual, 25% none
    return [
      { state: 'super', probability: 0.25 },
      { state: 'visual', probability: 0.50 },
      { state: 'none', probability: 0.25 },
    ];
  }
  if (stateA === 'visual' || stateB === 'visual') {
    // One visual: 50% visual, 50% none
    return [
      { state: 'visual', probability: 0.50 },
      { state: 'none', probability: 0.50 },
    ];
  }
  // Neither visual
  return [{ state: 'none', probability: 1 }];
}

// Calculate recessive outcomes
function calcRecessive(stateA: 'visual' | 'het' | 'none', stateB: 'visual' | 'het' | 'none'): { state: 'visual' | 'het' | 'none'; probability: number }[] {
  // visual x visual -> 100% visual
  if (stateA === 'visual' && stateB === 'visual') {
    return [{ state: 'visual', probability: 1 }];
  }
  // visual x het -> 50% visual, 50% het
  if ((stateA === 'visual' && stateB === 'het') || (stateA === 'het' && stateB === 'visual')) {
    return [
      { state: 'visual', probability: 0.50 },
      { state: 'het', probability: 0.50 },
    ];
  }
  // visual x none -> 100% het
  if ((stateA === 'visual' && stateB === 'none') || (stateA === 'none' && stateB === 'visual')) {
    return [{ state: 'het', probability: 1 }];
  }
  // het x het -> 25% visual, 50% het, 25% none
  if (stateA === 'het' && stateB === 'het') {
    return [
      { state: 'visual', probability: 0.25 },
      { state: 'het', probability: 0.50 },
      { state: 'none', probability: 0.25 },
    ];
  }
  // het x none -> 50% het, 50% none
  if ((stateA === 'het' && stateB === 'none') || (stateA === 'none' && stateB === 'het')) {
    return [
      { state: 'het', probability: 0.50 },
      { state: 'none', probability: 0.50 },
    ];
  }
  // none x none -> 100% none
  return [{ state: 'none', probability: 1 }];
}

// Calculate single gene outcomes with pos-het expansion
function calculateGeneOutcomes(geneA: GeneticGene, geneB: GeneticGene): GeneResult {
  const name = geneA.name;
  const mode = geneA.mode;
  
  // Expand pos-het states for both parents
  const branchesA = expandPosHet(geneA.state);
  const branchesB = expandPosHet(geneB.state);
  
  // Calculate weighted outcomes
  const outcomeMap = new Map<string, number>();
  
  for (const branchA of branchesA) {
    for (const branchB of branchesB) {
      const branchWeight = branchA.weight * branchB.weight;
      
      let results: { state: 'super' | 'visual' | 'het' | 'none'; probability: number }[];
      
      if (mode === 'dominant') {
        results = calcDominant(
          branchA.realState as 'visual' | 'none',
          branchB.realState as 'visual' | 'none'
        );
      } else if (mode === 'codominant') {
        results = calcCodominant(
          branchA.realState as 'visual' | 'none',
          branchB.realState as 'visual' | 'none'
        );
      } else {
        results = calcRecessive(
          branchA.realState as 'visual' | 'het' | 'none',
          branchB.realState as 'visual' | 'het' | 'none'
        );
      }
      
      for (const result of results) {
        const key = result.state;
        const existingProb = outcomeMap.get(key) || 0;
        outcomeMap.set(key, existingProb + result.probability * branchWeight);
      }
    }
  }
  
  // Convert map to array
  const outcomes: { state: 'super' | 'visual' | 'het' | 'none'; probability: number }[] = [];
  outcomeMap.forEach((probability, state) => {
    if (probability > 0.001) { // Filter out negligible probabilities
      outcomes.push({ state: state as 'super' | 'visual' | 'het' | 'none', probability });
    }
  });
  
  return { name, mode, outcomes };
}

// Match genes between parents by name
function matchGenes(genesA: GeneticGene[], genesB: GeneticGene[]): { geneA: GeneticGene; geneB: GeneticGene }[] {
  const allGeneNames = new Set<string>();
  
  genesA.forEach(g => allGeneNames.add(g.name.toLowerCase()));
  genesB.forEach(g => allGeneNames.add(g.name.toLowerCase()));
  
  const pairs: { geneA: GeneticGene; geneB: GeneticGene }[] = [];
  
  allGeneNames.forEach(geneName => {
    const geneA = genesA.find(g => g.name.toLowerCase() === geneName);
    const geneB = genesB.find(g => g.name.toLowerCase() === geneName);
    
    if (geneA && geneB) {
      // Both parents have this gene defined
      pairs.push({ geneA, geneB });
    } else if (geneA) {
      // Only parent A has it, treat parent B as 'none'
      pairs.push({
        geneA,
        geneB: { name: geneA.name, mode: geneA.mode, state: 'none' },
      });
    } else if (geneB) {
      // Only parent B has it, treat parent A as 'none'
      pairs.push({
        geneA: { name: geneB.name, mode: geneB.mode, state: 'none' },
        geneB,
      });
    }
  });
  
  return pairs;
}

// Combine outcomes across all genes
function combineOutcomes(geneResults: GeneResult[]): CombinedOutcome[] {
  if (geneResults.length === 0) {
    return [{ label: 'Normal', percentage: 100, visuals: [], hets: [], supers: [] }];
  }
  
  // Start with the first gene's outcomes
  let currentCombinations: {
    probability: number;
    geneStates: { name: string; mode: InheritanceMode; state: 'super' | 'visual' | 'het' | 'none' }[];
  }[] = geneResults[0].outcomes.map(o => ({
    probability: o.probability,
    geneStates: [{ name: geneResults[0].name, mode: geneResults[0].mode, state: o.state }],
  }));
  
  // Multiply with each subsequent gene
  for (let i = 1; i < geneResults.length; i++) {
    const gene = geneResults[i];
    const newCombinations: typeof currentCombinations = [];
    
    for (const combo of currentCombinations) {
      for (const outcome of gene.outcomes) {
        newCombinations.push({
          probability: combo.probability * outcome.probability,
          geneStates: [...combo.geneStates, { name: gene.name, mode: gene.mode, state: outcome.state }],
        });
      }
    }
    
    currentCombinations = newCombinations;
  }
  
  // Convert to CombinedOutcome format and merge duplicates
  const outcomeMap = new Map<string, CombinedOutcome>();
  
  for (const combo of currentCombinations) {
    const visuals: string[] = [];
    const hets: string[] = [];
    const supers: string[] = [];
    
    for (const gs of combo.geneStates) {
      if (gs.state === 'super') {
        supers.push(`Super ${gs.name}`);
      } else if (gs.state === 'visual') {
        visuals.push(gs.name);
      } else if (gs.state === 'het') {
        hets.push(gs.name);
      }
    }
    
    // Build label
    const parts: string[] = [];
    if (supers.length > 0) parts.push(supers.join(' + '));
    if (visuals.length > 0) parts.push(visuals.join(' + '));
    
    let label = parts.length > 0 ? parts.join(' + ') : 'Normal';
    
    if (hets.length > 0) {
      label += ` (het ${hets.join(', ')})`;
    }
    
    // Use sorted arrays as key for deduplication
    const key = JSON.stringify({
      supers: [...supers].sort(),
      visuals: [...visuals].sort(),
      hets: [...hets].sort(),
    });
    
    const existing = outcomeMap.get(key);
    if (existing) {
      existing.percentage += combo.probability * 100;
    } else {
      outcomeMap.set(key, {
        label,
        percentage: combo.probability * 100,
        visuals,
        hets,
        supers,
      });
    }
  }
  
  // Convert to array and sort by percentage descending
  const results = Array.from(outcomeMap.values())
    .filter(o => o.percentage >= 0.1) // Filter out < 0.1%
    .sort((a, b) => b.percentage - a.percentage);
  
  return results;
}

// Main calculator function
export function calculateAdvancedGenetics(
  genesA: GeneticGene[],
  genesB: GeneticGene[]
): CombinedOutcome[] {
  // Match genes between parents
  const genePairs = matchGenes(genesA, genesB);
  
  if (genePairs.length === 0) {
    return [{ label: 'Normal', percentage: 100, visuals: [], hets: [], supers: [] }];
  }
  
  // Calculate outcomes for each gene
  const geneResults: GeneResult[] = genePairs.map(pair => 
    calculateGeneOutcomes(pair.geneA, pair.geneB)
  );
  
  // Combine outcomes across all genes
  return combineOutcomes(geneResults);
}

// Group outcomes by category for display
export function groupOutcomes(outcomes: CombinedOutcome[]): {
  visuals: CombinedOutcome[];
  carriers: CombinedOutcome[];
  normals: CombinedOutcome[];
} {
  const visuals: CombinedOutcome[] = [];
  const carriers: CombinedOutcome[] = [];
  const normals: CombinedOutcome[] = [];
  
  for (const outcome of outcomes) {
    if (outcome.supers.length > 0 || outcome.visuals.length > 0) {
      visuals.push(outcome);
    } else if (outcome.hets.length > 0) {
      carriers.push(outcome);
    } else {
      normals.push(outcome);
    }
  }
  
  return { visuals, carriers, normals };
}
