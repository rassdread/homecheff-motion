import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildVoicePreviewTextHash,
  inferVoicePreviewType,
  sanitizeVoicePreviewVoiceId,
  voicePreviewBlobPathname,
} from "@/lib/studio-voice-preview-cache-key";
import { voicePreviewCacheKeyForTest } from "@/server/studio/synthesize-character-voice-preview";
import {
  COST_ACTION,
  INSTRUMENTATION_ONLY_ACTIONS,
} from "@/server/provider-cost/cost-event-types";

describe("voice preview cache keys", () => {
  it("builds stable text hash and blob pathname", () => {
    const hash = buildVoicePreviewTextHash({
      voiceId: "21m00Tcm4TlvDq8ikWAM",
      previewText: "Hello, I am Chef Sergio.",
      language: "en",
      modelId: "eleven_multilingual_v2",
    });
    assert.equal(hash, voicePreviewCacheKeyForTest({
      voiceId: "21m00Tcm4TlvDq8ikWAM",
      previewText: "Hello, I am Chef Sergio.",
      language: "en",
      modelId: "eleven_multilingual_v2",
    }));
    assert.match(
      voicePreviewBlobPathname("21m00Tcm4TlvDq8ikWAM", hash),
      /^studio\/voice-previews\/[a-z0-9_-]+\/[a-f0-9]{32}\.mp3$/
    );
  });

  it("sanitizes voice ids for blob paths", () => {
    assert.equal(sanitizeVoicePreviewVoiceId("ABC/123 Voice!"), "abc-123-voice-");
  });

  it("infers custom vs generic preview types", () => {
    assert.equal(
      inferVoicePreviewType({
        sampleLine: "Custom line",
        defaultLine: "Hello, I am Sergio.",
      }),
      "custom"
    );
    assert.equal(
      inferVoicePreviewType({
        sampleLine: "Hello, I am Sergio.",
        defaultLine: "Hello, I am Sergio.",
      }),
      "generic"
    );
    assert.equal(inferVoicePreviewType({ explicitType: "chef", defaultLine: "" }), "chef");
  });
});

describe("unified voice preview cache wiring", () => {
  const synthesisPath = join(
    process.cwd(),
    "src/server/studio/synthesize-character-voice-preview.ts"
  );

  it("synthesis checks blob cache before ElevenLabs and stores on miss", () => {
    const src = readFileSync(synthesisPath, "utf8");
    assert.match(src, /lookupVoicePreviewCache/);
    assert.match(src, /storeVoicePreviewCache/);
    assert.match(src, /meterVoicePreviewCacheHit/);
    assert.match(src, /cacheHit: true/);
    assert.match(src, /cacheHit: false/);
  });

  it("cache hit action is instrumentation-only", () => {
    assert.ok(INSTRUMENTATION_ONLY_ACTIONS.has(COST_ACTION.VOICE_PREVIEW_CACHE_HIT));
  });

  it("all preview panels route through requestCharacterVoicePreview", () => {
    const sectionPath = join(
      process.cwd(),
      "src/components/studio/studio-character-voice-library-section.tsx"
    );
    const centerPath = join(process.cwd(), "src/components/studio/studio-character-voice-center.tsx");
    const sectionSrc = readFileSync(sectionPath, "utf8");
    const centerSrc = readFileSync(centerPath, "utf8");
    assert.match(sectionSrc, /requestCharacterVoicePreview/);
    assert.match(sectionSrc, /previewType/);
    assert.match(centerSrc, /requestCharacterVoicePreview/);
  });

  it("preview dedup report tracks cache hits and savings", () => {
    const aggPath = join(
      process.cwd(),
      "src/server/provider-cost/studio-cost-aggregation.ts"
    );
    const src = readFileSync(aggPath, "utf8");
    assert.match(src, /VOICE_PREVIEW_CACHE_HIT/);
    assert.match(src, /cacheHitRate/);
    assert.match(src, /estimatedCacheSavingsUsd/);
    assert.match(src, /topPreviewUsers/);
    assert.match(src, /topPreviewVoices/);
    assert.match(src, /topPreviewTexts/);
  });
});
