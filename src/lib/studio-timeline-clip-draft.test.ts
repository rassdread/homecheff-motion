import assert from "node:assert/strict";
import test from "node:test";
import { clipDraftPatch, draftFromClip } from "@/lib/studio-timeline-clip-draft";

const clip = { startMs: 11000, durationMs: 900, inMs: 100, volume: 80 };

test("clip draft saves only changed whole-number fields", () => {
  const same = clipDraftPatch(clip, draftFromClip(clip));
  assert.equal(same.ok, true);
  if (same.ok) assert.deepEqual(same.patch, {});

  const changed = clipDraftPatch(clip, { ...draftFromClip(clip), durationMs: "1200" });
  assert.equal(changed.ok, true);
  if (changed.ok) assert.deepEqual(changed.patch, { durationMs: 1200 });
});

test("clip draft keeps invalid input and reports the field", () => {
  const fractional = clipDraftPatch(clip, { ...draftFromClip(clip), volume: "80.5" });
  assert.deepEqual(fractional, { ok: false, field: "volume" });
  const loud = clipDraftPatch(clip, { ...draftFromClip(clip), volume: "140" });
  assert.deepEqual(loud, { ok: false, field: "volume" });
  const empty = clipDraftPatch(clip, { ...draftFromClip(clip), durationMs: "" });
  assert.deepEqual(empty, { ok: false, field: "duration" });
});
