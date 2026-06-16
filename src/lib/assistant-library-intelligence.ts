import type { AssistantInterpretation } from "@/types/assistant-interpretation";
import type { LibraryAssetIndexEntry } from "@/lib/library-asset-index";
import type { AssistantContextSnapshot } from "@/lib/assistant-context-layer";
import type { ProducerResponseOption } from "@/types/assistant-producer";
import type { AssistantStudioContext } from "@/types/assistant-studio-brain";

const MASCOT_KEYWORDS = ["mascot", "mascotte", "chef", "garden", "designer", "poppetje", "figuurtje"];

export type LibraryMascotEntry = {
  id: string;
  label: string;
  assetName: string;
  registryAssetId: string;
  variantHint?: "chef" | "garden" | "designer" | "other";
};

function classifyMascotVariant(name: string): LibraryMascotEntry["variantHint"] {
  const lower = name.toLowerCase();
  if (lower.includes("chef")) {
    return "chef";
  }
  if (lower.includes("garden")) {
    return "garden";
  }
  if (lower.includes("designer")) {
    return "designer";
  }
  return "other";
}

function isLikelyMascot(asset: LibraryAssetIndexEntry): boolean {
  const blob = `${asset.assetName} ${asset.promptSummary ?? ""} ${asset.characterType ?? ""}`.toLowerCase();
  return MASCOT_KEYWORDS.some((keyword) => blob.includes(keyword));
}

export function listLibraryMascots(snapshot: AssistantContextSnapshot): LibraryMascotEntry[] {
  return snapshot.library.characters.filter(isLikelyMascot).map((asset) => {
    const hint = classifyMascotVariant(asset.assetName);
    const label =
      hint === "chef"
        ? "Chef variant"
        : hint === "garden"
          ? "Garden variant"
          : hint === "designer"
            ? "Designer variant"
            : asset.assetName;
    return {
      id: asset.registryAssetId,
      label,
      assetName: asset.assetName,
      registryAssetId: asset.registryAssetId,
      variantHint: hint,
    };
  });
}

export function buildLibraryMascotProducerOptions(
  snapshot: AssistantContextSnapshot,
  locale?: string
): ProducerResponseOption[] {
  const nl = !locale || locale.startsWith("nl");
  const mascots = listLibraryMascots(snapshot);
  const options: ProducerResponseOption[] = mascots.slice(0, 4).map((mascot) => ({
    id: `mascot_${mascot.registryAssetId}`,
    label:
      mascot.variantHint === "chef"
        ? nl
          ? "Chef variant"
          : "Chef variant"
        : mascot.variantHint === "garden"
          ? nl
            ? "Garden variant"
            : "Garden variant"
          : mascot.variantHint === "designer"
            ? nl
              ? "Designer variant"
              : "Designer variant"
            : mascot.assetName,
    promptMessage: nl
      ? `Maak een variant van ${mascot.assetName}`
      : `Make a variant of ${mascot.assetName}`,
    actionId: "create_character_from_reference",
    route: "/studio/characters/from-reference",
  }));

  options.push({
    id: "mascot_new",
    label: nl ? "Nieuwe mascotte" : "New mascot",
    promptMessage: nl ? "Nieuwe mascotte ontwerpen" : "Design a new mascot",
    actionId: "create_character",
    route: "/studio/characters/new",
  });

  return options;
}

export function buildLibraryMascotIntro(
  snapshot: AssistantContextSnapshot,
  locale?: string
): string | null {
  const nl = !locale || locale.startsWith("nl");
  const mascots = listLibraryMascots(snapshot);
  if (mascots.length === 0) {
    return null;
  }
  return nl
    ? `Ik zie al ${mascots.length} mascotte(s) in je bibliotheek.`
    : `I already see ${mascots.length} mascot(s) in your library.`;
}

export function libraryHasSoccerAssets(snapshot: AssistantContextSnapshot): boolean {
  const hay = [
    ...snapshot.library.characters,
    ...snapshot.library.motionVideos,
    ...snapshot.library.fusionOutputs,
    ...snapshot.library.assets,
  ];
  return hay.some((asset) => {
    const blob = `${asset.assetName} ${asset.promptSummary ?? ""}`.toLowerCase();
    return (
      blob.includes("voetbal") ||
      blob.includes("football") ||
      blob.includes("soccer") ||
      blob.includes("stadion") ||
      blob.includes("stadium") ||
      blob.includes("goal")
    );
  });
}

export function enrichMascotInterpretationWithLibrary(
  interpretation: AssistantInterpretation,
  studio: AssistantStudioContext,
  locale?: string
): AssistantInterpretation {
  const intro = buildLibraryMascotIntro(
    { projects: [], storyboards: [], library: { characters: studio.characters, fusionOutputs: [], motionVideos: [], publishExports: [], references: [], voice: [], music: [], sfx: [], assets: studio.assets } },
    locale
  );
  if (!intro) {
    return interpretation;
  }
  const mascotOptions = buildLibraryMascotProducerOptions(
    { projects: [], storyboards: [], library: { characters: studio.characters, fusionOutputs: [], motionVideos: [], publishExports: [], references: [], voice: [], music: [], sfx: [], assets: studio.assets } },
    locale
  );
  return {
    ...interpretation,
    understoodGoal: `${interpretation.understoodGoal} ${intro}`.trim(),
    alternativeIntents: mascotOptions.map((option) => ({
      label: option.label,
      intent: option.id,
      reason: option.promptMessage,
    })),
    missingInputs: [],
    suggestedRoute: mascotOptions[0]?.route ?? interpretation.suggestedRoute,
  };
}
