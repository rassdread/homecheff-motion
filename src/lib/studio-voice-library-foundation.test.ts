import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAccentFilters,
  canonicalAccentForVoice,
  classifyVoiceAccent,
  filterVoiceLibrary,
} from "@/lib/studio-voice-accent-model";
import { resolveElevenLabsVoiceId } from "@/lib/elevenlabs-voice";
import {
  buildVoiceLibraryCatalog,
  mockVoiceLibraryCatalog,
} from "@/lib/studio-voice-library-catalog";
import {
  buildDirectorVoiceSuggestions,
  buildProductionBriefVoiceSuggestions,
  suggestVoicesForLocation,
} from "@/lib/studio-voice-location-suggestions";
import {
  buildVoicePersonaPresets,
  findPersonaPresetById,
} from "@/lib/studio-voice-persona-presets";
import {
  characterHasExplicitVoiceChoice,
  formatLibraryVoiceProfileRef,
  isLibraryVoiceProfileRef,
  normalizeVoiceProfileForSynthesis,
  parseVoiceProfileRef,
  resolveProviderVoiceIdFromProfile,
} from "@/lib/studio-voice-profile-ref";
import { buildCreationAssistantView } from "@/lib/studio-creation-assistant";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { buildProductionBrief } from "@/lib/studio-production-brief-builder";
import {
  studioCharacterListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("studio-voice-library-catalog", () => {
  it("maps mock catalog entries with metadata fields", async () => {
    const catalog = await buildVoiceLibraryCatalog();
    assert.equal(catalog.version, 1);
    assert.ok(catalog.voices.length >= 6);
    const british = catalog.voices.find((v) => v.accent === "british");
    assert.ok(british);
    assert.ok(british!.id);
    assert.ok(british!.name);
    assert.ok(british!.gender);
    assert.ok(british!.language);
    assert.ok(typeof british!.labels === "object");
    assert.ok(typeof british!.category === "string");
  });
});

describe("studio-voice-accent-model", () => {
  it("classifies known ElevenLabs accent labels", () => {
    assert.equal(classifyVoiceAccent("british")?.id, "english.british");
    assert.equal(classifyVoiceAccent("jamaican")?.id, "english.jamaican");
    assert.equal(classifyVoiceAccent("dutch")?.id, "dutch.nederlands");
    assert.equal(classifyVoiceAccent("surinamese")?.id, "dutch.surinaams");
    assert.equal(classifyVoiceAccent("italian")?.id, "english.italian");
    assert.equal(classifyVoiceAccent("latin american")?.id, "spanish.latin_american");
  });

  it("builds accent filters only for accents present in catalog", () => {
    const catalog = mockVoiceLibraryCatalog();
    const filters = buildAccentFilters(catalog);
    assert.ok(filters.some((f) => f.id === "english.british"));
    assert.ok(filters.every((f) => f.voiceCount > 0));
  });

  it("filters library voices by accent and gender", () => {
    const catalog = mockVoiceLibraryCatalog();
    const filtered = filterVoiceLibrary(catalog, {
      accentId: "english.jamaican",
      gender: "male",
    });
    assert.ok(filtered.length >= 1);
    for (const voice of filtered) {
      assert.equal(canonicalAccentForVoice(voice)?.id, "english.jamaican");
      assert.equal(voice.gender, "male");
    }
  });
});

describe("studio-voice-persona-presets", () => {
  it("builds curated persona presets linked to library voices", () => {
    const catalog = mockVoiceLibraryCatalog();
    const presets = buildVoicePersonaPresets(catalog);
    assert.ok(presets.length >= 10);
    const britishChef = findPersonaPresetById(catalog, "british_chef");
    assert.ok(britishChef);
    assert.ok(britishChef!.voiceId);
    assert.ok(britishChef!.voiceName);
    const available = presets.filter((p) => p.available);
    const ids = available.map((p) => p.voiceId);
    assert.equal(new Set(ids).size, ids.length, "available persona presets should not duplicate voices");
  });
});

describe("studio-voice-profile-ref library + clone retention", () => {
  it("round-trips library voice refs", () => {
    const ref = formatLibraryVoiceProfileRef("voice-lib-1");
    assert.equal(isLibraryVoiceProfileRef(ref), true);
    assert.equal(parseVoiceProfileRef(ref).kind, "library");
    assert.equal(resolveProviderVoiceIdFromProfile(ref), "voice-lib-1");
    assert.equal(resolveElevenLabsVoiceId(ref), "voice-lib-1");
  });

  it("preserves clone refs for synthesis", () => {
    const cloneRef = "clone:abc123";
    assert.equal(normalizeVoiceProfileForSynthesis(cloneRef), cloneRef);
    assert.equal(resolveElevenLabsVoiceId(cloneRef), "abc123");
  });

  it("treats default warm narrator as no explicit choice", () => {
    assert.equal(characterHasExplicitVoiceChoice("warm_narrator"), false);
    assert.equal(characterHasExplicitVoiceChoice(formatLibraryVoiceProfileRef("x")), true);
  });
});

describe("studio-voice-location-suggestions", () => {
  it("suggests Jamaican voices for Kingston", () => {
    const suggestion = suggestVoicesForLocation("Kingston market");
    assert.ok(suggestion);
    assert.equal(suggestion!.accentCanonicalId, "english.jamaican");
    assert.ok(suggestion!.personaPresets.length >= 1);
    assert.ok(suggestion!.recommendedVoices.length >= 1);
  });

  it("suggests Dutch voices for Amsterdam", () => {
    const suggestion = suggestVoicesForLocation("Amsterdam");
    assert.ok(suggestion);
    assert.equal(suggestion!.accentCanonicalId, "dutch.nederlands");
  });

  it("adds optional production brief voice persona recommendations", () => {
    const recs = buildProductionBriefVoiceSuggestions({
      contentType: "storytelling",
      locationNames: ["London kitchen"],
    });
    assert.ok(recs.length >= 1);
    assert.ok(recs[0]!.personaPresetIds.length >= 1);
  });
});

describe("studio-voice-library integrations", () => {
  it("includes director voice suggestions without auto-select", () => {
    const proposal = buildDirectorProposal({
      idea: "A chef story in Kingston with local flavor",
      storyboard: studioStoryboardDetail({
        voiceEnabled: true,
        scenes: [studioSceneDetail({ order: 0 })],
      }),
      characters: [studioCharacterListItem({ id: "c1", name: "Chef", voiceEnabled: true })],
      locations: [],
      props: [],
      worlds: [],
    });
    assert.ok(proposal);
    assert.ok(Array.isArray(proposal!.voices.voiceSuggestions));
  });

  it("adds creation assistant choose-voice task when voice enabled without choice", () => {
    const storyboard = studioStoryboardDetail({
      voiceEnabled: true,
      scenes: [
        studioSceneDetail({
          order: 0,
          characters: [studioCharacterListItem({ id: "c1", name: "Chef", voiceEnabled: true })],
        }),
      ],
    });
    const view = buildCreationAssistantView({
      storyboard,
      characters: [studioCharacterListItem({ id: "c1", name: "Chef", voiceEnabled: true })],
    });
    const task = view.nowTasks.find((t) => t.source === "voice_library");
    assert.ok(task);
    assert.equal(task!.messageKey, "studio.creationAssistant.task.chooseVoice");
  });

  it("builds production brief with voice persona recommendation", () => {
    const brief = buildProductionBrief({
      idea: "Community garden story in Amsterdam with local growers",
      characters: [],
      locations: [],
    });
    assert.ok(brief);
    assert.ok(
      brief!.recommendations.some((r) => r.messageKey === "studio.productionBrief.recommendation.voicePersonas")
    );
  });
});
