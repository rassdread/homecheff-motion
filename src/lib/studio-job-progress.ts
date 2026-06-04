/** Progress percent from completed steps (0–100). */
export function computeStudioJobProgress(currentStep: number, totalSteps: number): number {
  if (totalSteps <= 0) {
    return 0;
  }
  const clamped = Math.max(0, Math.min(currentStep, totalSteps));
  return Math.round((clamped / totalSteps) * 100);
}

export function formatStudioJobStepLabel(params: {
  sceneIndex: number;
  totalScenes: number;
  sceneTitle: string;
  action: string;
}): string {
  const title = params.sceneTitle.trim() || `Scene ${params.sceneIndex + 1}`;
  return `${params.action}: ${title} (${params.sceneIndex + 1}/${params.totalScenes})`;
}
