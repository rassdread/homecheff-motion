import type { SpeakerVoiceSegment } from "@/types/studio-character-voice";
import type { TimedVoiceSegment } from "@/types/studio-voice-execution";

/** Map speaker lines to timed segments with cumulative timeline. */
export function buildTimedSegmentsFromSpeakerLines(
  speakerSegments: SpeakerVoiceSegment[],
  segmentDurations: number[]
): TimedVoiceSegment[] {
  let cursor = 0;
  const out: TimedVoiceSegment[] = [];
  for (let i = 0; i < speakerSegments.length; i++) {
    const seg = speakerSegments[i]!;
    const durationSeconds = Math.max(0.25, segmentDurations[i] ?? 1);
    const startSeconds = cursor;
    const endSeconds = startSeconds + durationSeconds;
    cursor = endSeconds;
    out.push({
      sceneId: `speaker-${i}`,
      order: i,
      startSeconds,
      endSeconds,
      durationSeconds,
      text: seg.text,
      speaker: seg.speaker,
      characterId: seg.characterId,
      voiceProfile: seg.voiceProfile,
    });
  }
  return out;
}
