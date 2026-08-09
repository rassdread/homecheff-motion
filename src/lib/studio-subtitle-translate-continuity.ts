/**
 * S.7E — Continuity helpers for subtitle/translation language tracks.
 */

export type LanguageTrackContinuityCheck = {
  ok: boolean;
  kind: "subtitle" | "translation";
  expectedLanguage: string | null;
  hops: Array<{ hop: string; language: string | null; match: boolean }>;
  driftDetected: boolean;
  regenerationForbidden: true;
};

export function checkSubtitleLanguageContinuity(input: {
  storyboardLanguage: string | null;
  motionLanguage?: string | null;
  renderLanguage?: string | null;
}): LanguageTrackContinuityCheck {
  const expected = input.storyboardLanguage?.trim().toLowerCase().slice(0, 2) || null;
  const hops: LanguageTrackContinuityCheck["hops"] = [
    { hop: "storyboard", language: expected, match: true },
  ];
  if (input.motionLanguage !== undefined) {
    const lang = input.motionLanguage?.trim().toLowerCase().slice(0, 2) || null;
    hops.push({ hop: "motion", language: lang, match: !expected || lang === expected });
  }
  if (input.renderLanguage !== undefined) {
    const lang = input.renderLanguage?.trim().toLowerCase().slice(0, 2) || null;
    hops.push({ hop: "render", language: lang, match: !expected || lang === expected });
  }
  const driftDetected = hops.some((h) => !h.match);
  return {
    ok: !driftDetected,
    kind: "subtitle",
    expectedLanguage: expected,
    hops,
    driftDetected,
    regenerationForbidden: true,
  };
}
