import assert from "node:assert/strict";
import test from "node:test";
import { filmVideoLiveEnabled, filmVoiceLiveEnabled } from "@/server/studio/studio-film-live-generation";

test("film provider gates stay closed unless the existing real-call switches are on", () => {
  const previous = {
    animation: process.env.ANIMATION_PROVIDER,
    vidu: process.env.VIDU_ENABLE_REAL_CALLS,
    voice: process.env.STUDIO_VOICE_PROVIDER,
    eleven: process.env.ELEVENLABS_API_KEY,
  };
  process.env.ANIMATION_PROVIDER = "vidu";
  delete process.env.VIDU_ENABLE_REAL_CALLS;
  assert.equal(filmVideoLiveEnabled(), false);
  process.env.VIDU_ENABLE_REAL_CALLS = "false";
  assert.equal(filmVideoLiveEnabled(), false);
  process.env.VIDU_ENABLE_REAL_CALLS = "true";
  assert.equal(filmVideoLiveEnabled(), true);
  process.env.ANIMATION_PROVIDER = "mock";
  assert.equal(filmVideoLiveEnabled(), false);

  process.env.STUDIO_VOICE_PROVIDER = "elevenlabs";
  delete process.env.ELEVENLABS_API_KEY;
  assert.equal(filmVoiceLiveEnabled(), false);
  process.env.ELEVENLABS_API_KEY = "cert-not-a-live-call";
  assert.equal(filmVoiceLiveEnabled(), true);
  process.env.STUDIO_VOICE_PROVIDER = "mock";
  assert.equal(filmVoiceLiveEnabled(), false);

  if (previous.animation === undefined) delete process.env.ANIMATION_PROVIDER;
  else process.env.ANIMATION_PROVIDER = previous.animation;
  if (previous.vidu === undefined) delete process.env.VIDU_ENABLE_REAL_CALLS;
  else process.env.VIDU_ENABLE_REAL_CALLS = previous.vidu;
  if (previous.voice === undefined) delete process.env.STUDIO_VOICE_PROVIDER;
  else process.env.STUDIO_VOICE_PROVIDER = previous.voice;
  if (previous.eleven === undefined) delete process.env.ELEVENLABS_API_KEY;
  else process.env.ELEVENLABS_API_KEY = previous.eleven;
});
