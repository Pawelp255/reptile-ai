/**
 * Sample datasets (Atlas/Luna/Spike, legacy extended demo) are gated off in production builds
 * unless `VITE_ENABLE_SAMPLE_DATASETS=true` is set.
 */
export function isSampleDatasetEnabled(): boolean {
  return (
    Boolean(import.meta.env.DEV) || import.meta.env.VITE_ENABLE_SAMPLE_DATASETS === "true"
  );
}

export function assertSampleDatasetAllowed(): void {
  if (!isSampleDatasetEnabled()) {
    throw new Error("Sample datasets are disabled in this build.");
  }
}
