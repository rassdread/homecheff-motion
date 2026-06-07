import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cloneMockVoice,
  parseCloneResponse,
} from "@/lib/elevenlabs-voice-clone";
import {
  formatClonedVoiceProfileRef,
  formatLibraryVoiceProfileRef,
  isClonedVoiceProfileRef,
  isLibraryVoiceProfileRef,
  parseVoiceProfileRef,
  resolveProviderVoiceIdFromProfile,
} from "@/lib/studio-voice-profile-ref";
import { resolveElevenLabsVoiceId } from "@/lib/elevenlabs-voice";
import { validateVoiceSampleUpload } from "@/lib/studio-voice-sample-validation";

describe("studio-voice-profile-ref", () => {
  it("round-trips cloned voice refs", () => {
    const ref = formatClonedVoiceProfileRef("abc123");
    assert.equal(isClonedVoiceProfileRef(ref), true);
    assert.equal(parseVoiceProfileRef(ref).kind, "clone");
    assert.equal(resolveProviderVoiceIdFromProfile(ref), "abc123");
    assert.equal(resolveElevenLabsVoiceId(ref), "abc123");
  });

  it("keeps preset profiles unchanged", () => {
    const ref = parseVoiceProfileRef("warm_narrator");
    assert.equal(ref.kind, "preset");
    assert.equal(isClonedVoiceProfileRef("warm_narrator"), false);
  });

  it("round-trips library voice refs", () => {
    const ref = formatLibraryVoiceProfileRef("lib-voice-1");
    assert.equal(isLibraryVoiceProfileRef(ref), true);
    assert.equal(parseVoiceProfileRef(ref).kind, "library");
    assert.equal(resolveElevenLabsVoiceId(ref), "lib-voice-1");
  });
});

describe("elevenlabs-voice-clone", () => {
  it("parses clone API response", () => {
    const result = parseCloneResponse({ voice_id: "voice-1", requires_verification: false });
    assert.equal(result.providerVoiceId, "voice-1");
    assert.equal(result.status, "completed");
  });

  it("mock clone returns profile ref", () => {
    const result = cloneMockVoice({
      name: "Chef",
      sampleBuffer: Buffer.from("fake"),
      sampleFileName: "sample.mp3",
      sampleContentType: "audio/mpeg",
    });
    assert.equal(result.provider, "mock");
    assert.ok(isClonedVoiceProfileRef(result.voiceProfileRef));
  });
});

describe("studio-voice-sample-validation", () => {
  it("rejects empty files", () => {
    const result = validateVoiceSampleUpload({ buffer: Buffer.alloc(0) });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "EMPTY_FILE");
    }
  });

  it("accepts mp3 by extension", () => {
    const result = validateVoiceSampleUpload({
      buffer: Buffer.alloc(1024),
      fileName: "sample.mp3",
    });
    assert.equal(result.ok, true);
  });

  it("rejects unknown file types", () => {
    const result = validateVoiceSampleUpload({
      buffer: Buffer.alloc(1024),
      fileName: "sample.ogg",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "INVALID_FILE_TYPE");
    }
  });
});
