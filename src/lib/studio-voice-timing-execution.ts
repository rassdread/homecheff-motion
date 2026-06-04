import { planVoiceTiming } from "@/lib/studio-voice-timing";
import type { VoiceScriptBundle } from "@/lib/studio-voice-script-builder";
import type { StudioVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { TimedVoiceSegment } from "@/types/studio-voice-execution";

/**
 * Map planning timings to absolute start/end seconds on the storyboard timeline.
 * Scales segment lengths when actual audio duration differs from estimates.
 */
export function buildTimedVoiceSegments(params: {
  storyboard: StudioStoryboardDetail;
  script: VoiceScriptBundle;
  profile: StudioVoiceProfilePreset;
  actualDurationSeconds?: number;
}): TimedVoiceSegment[] {
  const report = planVoiceTiming({
    storyboard: params.storyboard,
    script: params.script,
    profile: params.profile,
  });

  const rows = report.sceneTimings.filter((row) => row.words > 0);
  if (rows.length === 0) {
    return [];
  }

  const estimatedTotal = rows.reduce((sum, r) => sum + r.estimatedSeconds, 0);
  const targetTotal =
    params.actualDurationSeconds && params.actualDurationSeconds > 0
      ? params.actualDurationSeconds
      : estimatedTotal || report.estimatedSeconds;

  const scale =
    estimatedTotal > 0 ? targetTotal / estimatedTotal : 1;

  let cursor = 0;
  const segments: TimedVoiceSegment[] = [];

  for (const row of rows) {
    const scriptLine = params.script.sceneNarrations.find((s) => s.sceneId === row.sceneId);
    const durationSeconds = Math.max(0.25, row.estimatedSeconds * scale);
    const startSeconds = cursor;
    const endSeconds = startSeconds + durationSeconds;
    cursor = endSeconds;
    segments.push({
      sceneId: row.sceneId,
      order: row.order,
      startSeconds,
      endSeconds,
      durationSeconds,
      text: scriptLine?.text.trim() ?? "",
    });
  }

  return segments;
}
