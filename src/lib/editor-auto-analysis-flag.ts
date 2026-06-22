/**
 * Emergency kill-switch for editor auto vision analysis.
 * Manual "Opnieuw analyseren" is unaffected.
 */

export function isEditorAutoAnalysisEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_EDITOR_AUTO_ANALYSIS;
  if (flag === "false" || flag === "0") {
    return false;
  }
  return true;
}
