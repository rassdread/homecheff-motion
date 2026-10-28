/**
 * Assembles existing provider payloads for the V27.3 uploaded image.
 * Does not call a provider.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildVoiceRequest } from "../src/lib/elevenlabs-voice";
import { elevenLabsMusicRequestBody, elevenLabsSfxRequestBody } from "../src/lib/elevenlabs-music-sfx";
import { LOCKED_TEXT_SAFETY_BLOCK, buildInstantVideoPrompt } from "../src/lib/instant-premium-prompt";
import { pickReferenceUrlsForStillAdapter } from "../src/lib/studio-production-prompt-orchestrator";
import { mergePresetPromptWithUserIdea } from "../src/lib/studio-v27-workflow-routes";
import { buildBudgetedViduPrompt } from "../src/lib/vidu-prompt-budget";
import { getVoiceProfilePreset } from "../src/lib/studio-voice-profiles";
import type { ProductionInstructions } from "../src/types/studio-unified-production-context";

const imageUrl = "http://127.0.0.1:3462/api/studio/local-media/c6c23c80-23f6-48a6-bf5f-cdcff9034d69";
const preset = "Slow push in on the simmering pot.";
const idea = "The guide prepares the product and shows the result.";
const shared = {
  stylePreset: "food_promo" as const,
  duration: 8 as const,
  aspectRatio: "9:16" as const,
  selectedChips: ["cinematic_soft"],
  lockedTextMode: true,
};
const legacy = buildInstantVideoPrompt({ ...shared, userIntent: preset });
const unified = buildInstantVideoPrompt({
  ...shared,
  userIntent: mergePresetPromptWithUserIdea(preset, idea),
});
const budgeted = buildBudgetedViduPrompt({
  storyBlock: unified,
  motionBlock: "Slow push in. Warm kitchen light. No camera shake.",
  preservationBlock: "Preserve the guide and the uploaded kitchen reference.",
});
const references = pickReferenceUrlsForStillAdapter({
  references: [
    { url: imageUrl, entityId: "v273-kitchen", role: "identity", exactness: "MUST_PRESERVE", entityKind: "character" },
    { url: "https://cdn.example/logo.png", entityId: "logo-1", role: "logo", exactness: "MUST_PRESERVE", entityKind: "logo" },
  ],
} as ProductionInstructions);
const voice = buildVoiceRequest({
  script: "Welkom bij HomeCheff. Dit is de lokale certificatiefilm.",
  voiceProfile: "warm_narrator",
  voiceLanguage: "nl",
  narrationMode: "narrator",
  preset: getVoiceProfilePreset("warm_narrator"),
});
const music = elevenLabsMusicRequestBody({
  prompt: "Warm acoustic kitchen bed.",
  durationSeconds: 30,
  instrumental: true,
});
const sfx = elevenLabsSfxRequestBody({
  prompt: "A single ceramic bowl set on a wooden counter.",
  durationSeconds: 1,
});
const safetyLine = LOCKED_TEXT_SAFETY_BLOCK.split("\n")[0] ?? "";

const evidence = {
  paidProviderCalled: false,
  imageUrl,
  safetyLine,
  legacyHasSafety: legacy.includes(safetyLine),
  unifiedHasSafety: unified.includes(safetyLine),
  unifiedHasUserDirection: unified.includes(idea),
  unifiedHasPreset: unified.includes(preset) || unified.includes("User direction:"),
  legacyLength: legacy.length,
  unifiedLength: unified.length,
  viduPromptLength: budgeted.prompt.length,
  viduLimit: 3500,
  viduWithinLimit: budgeted.prompt.length <= 3500,
  viduHasAspectField: budgeted.prompt.includes("\"aspect_ratio\""),
  referenceOrder: references.map((item) => item.entityId),
  uploadedImageInReferences: references.some((item) => item.url === imageUrl),
  voiceModel: voice.model_id,
  voiceLanguage: voice.language_code,
  musicLengthMs: music.music_length_ms,
  musicInstrumental: music.force_instrumental,
  sfxDuration: sfx.duration_seconds,
};

async function main() {
  const dir = path.resolve("docs/studio-v27-3/evidence");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "prompt-payload.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
}

main();
