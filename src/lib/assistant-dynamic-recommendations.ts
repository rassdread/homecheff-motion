import { listActiveAdminRecommendations } from "@/lib/assistant-admin-recommendations";
import { libraryHasSoccerAssets, listLibraryMascots } from "@/lib/assistant-library-intelligence";
import type { AssistantStudioContext } from "@/types/assistant-studio-brain";
import type { AssistantRecommendation } from "@/types/assistant-recommendation";

export function buildDynamicLibraryRecommendations(
  studio: AssistantStudioContext,
  pathname: string
): AssistantRecommendation[] {
  const dynamic: AssistantRecommendation[] = [];

  if (libraryHasSoccerAssets({ projects: [], storyboards: [], library: { characters: studio.characters, fusionOutputs: [], motionVideos: [], publishExports: [], references: [], voice: [], music: [], sfx: [], assets: studio.assets } })) {
    dynamic.push({
      id: "dynamic_goal_celebration",
      category: "for_you",
      emoji: "⚽",
      titleKey: "assistant.recommendation.goal_celebration.title",
      descriptionKey: "assistant.recommendation.goal_celebration.description",
      whyKey: "assistant.recommendation.goal_celebration.why",
      promptMessage: "Maak een doelpuntviering",
      status: "ready",
      score: 88,
    });
  }

  const mascots = listLibraryMascots({
    projects: [],
    storyboards: [],
    library: {
      characters: studio.characters,
      fusionOutputs: [],
      motionVideos: [],
      publishExports: [],
      references: [],
      voice: [],
      music: [],
      sfx: [],
      assets: studio.assets,
    },
  });
  if (mascots.length > 0) {
    dynamic.push({
      id: "dynamic_mascot_animation",
      category: "for_you",
      emoji: "🎭",
      titleKey: "assistant.recommendation.motion_ready_character.title",
      descriptionKey: "assistant.recommendation.motion_ready_character.description",
      whyKey: "assistant.recommendation.motion_ready_character.why",
      promptMessage: `Maak een animatie van ${mascots[0]!.assetName}`,
      status: "ready",
      score: 86,
      characterName: mascots[0]!.assetName,
    });
  }

  for (const admin of listActiveAdminRecommendations(pathname).slice(0, 2)) {
    dynamic.push({
      id: admin.id,
      category: admin.category === "trending" ? "trending" : "hidden_possibilities",
      emoji: "✨",
      titleKey: "assistant.recommendation.continue_project.title",
      descriptionKey: "assistant.recommendation.continue_project.description",
      whyKey: "assistant.recommendation.continue_project.why",
      promptMessage: admin.assistantPrompt,
      status: "ready",
      score: admin.priority,
    });
  }

  return dynamic;
}
