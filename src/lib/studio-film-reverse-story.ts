/**
 * Reverse storytelling keeps each clip's duration and plays the last
 * scene first. It does not rename scenes or delete media.
 */

export function reverseStoryClipStarts(
  clips: Array<{ id: string; durationMs: number }>,
): Array<{ id: string; startMs: number; durationMs: number }> {
  let cursor = 0;
  return [...clips].reverse().map((clip) => {
    const startMs = cursor;
    cursor += clip.durationMs;
    return { id: clip.id, startMs, durationMs: clip.durationMs };
  });
}
