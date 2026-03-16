// AI Model definitions

export interface AIModel {
  id: string;
  name: string;
  description: string;
  /** Cost per 1M input tokens in USD */
  inputCostPer1M: number;
  /** Cost per 1M output tokens in USD */
  outputCostPer1M: number;
}

export const AVAILABLE_MODELS: AIModel[] = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Recommended)', description: 'Fast and cost-efficient', inputCostPer1M: 0.15, outputCostPer1M: 0.60 },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable, higher cost', inputCostPer1M: 2.50, outputCostPer1M: 10.0 },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Latest mini model', inputCostPer1M: 0.40, outputCostPer1M: 1.60 },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Latest flagship model', inputCostPer1M: 2.00, outputCostPer1M: 8.00 },
];

export type ModelId = string;

export const DEFAULT_MODEL: ModelId = 'gpt-4o-mini';

/** Estimate USD cost for a given number of input tokens and a model */
export function estimateCostUsd(inputTokens: number, modelId: ModelId): { inputCost: number; label: string } {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId) || AVAILABLE_MODELS[0];
  const inputCost = (inputTokens / 1_000_000) * model.inputCostPer1M;
  // Rough estimate: assume output ≈ 50% of input tokens
  const outputCost = ((inputTokens * 0.5) / 1_000_000) * model.outputCostPer1M;
  const total = inputCost + outputCost;

  if (total < 0.001) return { inputCost: total, label: '< $0.001' };
  return { inputCost: total, label: `~$${total.toFixed(4)}` };
}
