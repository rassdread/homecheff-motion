/** Image / transition duration helpers (client + server safe). */

export function getTransitionCount(imageCount: number): number {
  return Math.max(0, Math.floor(imageCount) - 1);
}

export function getTotalVideoDurationSeconds(
  imageCount: number,
  secondsPerTransition: number
): number {
  const n = getTransitionCount(imageCount);
  const per = Math.max(0, Number(secondsPerTransition));
  if (!Number.isFinite(per)) {
    return 0;
  }
  return Math.round(n * per);
}

export type DurationFormatLocale = "en" | "nl";

/**
 * Human-readable duration for UI (not billing).
 * EN: "20 sec", "1 min 10 sec"
 * NL: "20 seconden", "1 min 10 sec" (compact; full sentence often comes from i18n wrappers)
 */
export function formatDurationSeconds(
  totalSeconds: number,
  locale: DurationFormatLocale = "en"
): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) {
    if (locale === "nl") {
      return s === 1 ? "1 seconde" : `${s} seconden`;
    }
    return `${s} sec`;
  }
  const minutes = Math.floor(s / 60);
  const remainder = s % 60;
  if (locale === "nl") {
    if (remainder === 0) {
      return minutes === 1 ? "1 minuut" : `${minutes} minuten`;
    }
    const secPart = remainder === 1 ? "1 seconde" : `${remainder} seconden`;
    const minPart = minutes === 1 ? "1 min" : `${minutes} min`;
    return `${minPart} ${secPart}`;
  }
  if (remainder === 0) {
    return `${minutes} min`;
  }
  return `${minutes} min ${remainder} sec`;
}
