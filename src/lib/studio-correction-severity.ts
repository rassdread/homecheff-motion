import type { CorrectionSeverity } from "@/types/studio-correction";

export function scoreToCorrectionSeverity(score: number): CorrectionSeverity {
  if (score < 50) {
    return "critical";
  }
  if (score < 65) {
    return "high";
  }
  if (score < 80) {
    return "medium";
  }
  return "low";
}

export function severityPriority(severity: CorrectionSeverity): number {
  switch (severity) {
    case "critical":
      return 100;
    case "high":
      return 75;
    case "medium":
      return 50;
    case "low":
    default:
      return 25;
  }
}

export function mergeSeverity(a: CorrectionSeverity, b: CorrectionSeverity): CorrectionSeverity {
  return severityPriority(a) >= severityPriority(b) ? a : b;
}
