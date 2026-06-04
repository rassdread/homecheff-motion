import {
  buildConsistencyHaystack,
  memoryPhrases,
  scorePhrasesAgainstHaystack,
} from "@/lib/studio-consistency-text-signals";
import type {
  StudioVisionAnalyzeInput,
  StudioVisionProvider,
  StudioVisionRawAnalysis,
} from "@/server/studio-vision-providers/types";

/**
 * Deterministic heuristic when no vision API is available (tests / local without OpenAI).
 * Uses image URL markers and memory phrase overlap as a stand-in for pixel inspection.
 */
export class MockStudioVisionProvider implements StudioVisionProvider {
  readonly id = "mock";

  async analyzeImage(input: StudioVisionAnalyzeInput): Promise<StudioVisionRawAnalysis> {
    const haystack = buildConsistencyHaystack(
      `${input.generatedPrompt} ${input.sceneImageUrl}`,
      input.sceneTitle,
      input.sceneDescription,
      input.sceneAction
    );
    const forceLow = /vision-test-low/i.test(input.sceneImageUrl);
    const forceHigh = /vision-test-high/i.test(input.sceneImageUrl);

    const referenceComparisonUsed =
      input.references.characters.some((c) => c.referenceImageUrl) ||
      Boolean(input.references.location?.referenceImageUrl) ||
      input.references.props.some((p) => p.referenceImageUrl);

    const detectedElements: string[] = [];

    const characters = input.memory.characters.map((mem) => {
      const phrases = [
        ...memoryPhrases(mem.appearanceMemory),
        ...memoryPhrases(mem.defaultClothing),
        ...memoryPhrases(mem.defaultAccessories),
        ...memoryPhrases(mem.visualKeywords),
      ];
      const { score, missing } = scorePhrasesAgainstHaystack(haystack, phrases, 0.5);
      const effectiveScore = forceLow ? 40 : forceHigh ? 95 : score;
      const present = effectiveScore >= 55;
      const clothingVisible =
        !missing.some((m) => /apron|clothing|uniform/i.test(m)) || forceHigh;
      const accessoriesVisible =
        !missing.some((m) => /hat|accessory/i.test(m)) || forceHigh;
      for (const p of phrases.filter((ph) => haystack.includes(ph.toLowerCase()))) {
        detectedElements.push(`${mem.name}: ${p}`);
      }
      return {
        characterId: mem.id,
        name: mem.name,
        present,
        clothingVisible,
        accessoriesVisible,
        mascotProportionsOk: mem.role !== "mascot" || present,
        detectedTraits: phrases.filter((ph) => !missing.includes(ph)),
        missingTraits: missing,
        notes: present ? "Mock vision: traits matched heuristically." : "Mock vision: traits not detected.",
      };
    });

    let location = null;
    if (input.memory.location) {
      const loc = input.memory.location;
      const phrases = [
        ...memoryPhrases(loc.visualIdentity),
        ...memoryPhrases(loc.environmentKeywords),
        ...memoryPhrases(loc.worldMemory),
      ];
      const { score, missing } = scorePhrasesAgainstHaystack(haystack, phrases, 0.4);
      const effectiveScore = forceLow ? 45 : forceHigh ? 92 : score;
      location = {
        environmentElements: phrases.filter((ph) => !missing.includes(ph)),
        visualIdentityMatch: effectiveScore >= 60,
        worldCharacteristicsMatch: effectiveScore >= 55,
        missingElements: missing,
        notes: "Mock location vision heuristic.",
      };
    }

    const props = input.memory.props.map((mem) => {
      const phrases = [
        ...memoryPhrases(mem.appearanceMemory),
        ...memoryPhrases(mem.brandingRules),
      ];
      const { score, missing } = scorePhrasesAgainstHaystack(haystack, phrases, 0.5);
      const effectiveScore = forceLow ? 50 : forceHigh ? 90 : score;
      return {
        propId: mem.id,
        name: mem.name,
        visible: effectiveScore >= 55,
        brandingVisible: !missing.some((m) => /logo|brand|homecheff/i.test(m)) || forceHigh,
        detectedTraits: phrases.filter((ph) => !missing.includes(ph)),
        missingTraits: missing,
        notes: "Mock prop vision heuristic.",
      };
    });

    const brandingPhrases = ["homecheff", "globe logo", "green apron", "logo"];
    const brandingScore = scorePhrasesAgainstHaystack(haystack, brandingPhrases, 0.34);
    const branding = {
      homecheffLogoVisible: forceHigh || haystack.includes("homecheff"),
      logoPlacementOk: forceHigh || !brandingScore.missing.some((m) => /logo/i.test(m)),
      brandedPackagingVisible: forceHigh,
      detectedElements: brandingPhrases.filter((p) => haystack.includes(p)),
      missingElements: brandingScore.missing,
      notes: "Mock branding vision heuristic.",
    };

    let world = null;
    if (input.memory.world) {
      const w = input.memory.world;
      const phrases = [
        ...memoryPhrases(w.visualStyle),
        ...memoryPhrases(w.tone),
        ...memoryPhrases(w.continuityRules),
      ];
      const { score, missing } = scorePhrasesAgainstHaystack(haystack, phrases, 0.4);
      const effectiveScore = forceLow ? 48 : forceHigh ? 88 : score;
      world = {
        styleMatch: effectiveScore >= 60,
        toneMatch: effectiveScore >= 55,
        colorLanguageMatch: effectiveScore >= 50,
        detectedElements: phrases.filter((ph) => !missing.includes(ph)),
        missingElements: missing,
        notes: "Mock world vision heuristic.",
      };
    }

    return {
      providerId: this.id,
      analysisMethod: "mock_vision_heuristic",
      referenceComparisonUsed,
      detectedElements: [...new Set(detectedElements)],
      summary: "Mock vision provider (configure OPENAI_API_KEY for real visual QA).",
      characters,
      location,
      props,
      branding,
      world,
    };
  }
}
