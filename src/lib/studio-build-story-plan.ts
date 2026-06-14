import { buildStudioStorylineFromIdea } from "@/lib/studio-story-generator";
import type { StudioStoryInterpretation } from "@/lib/studio-story-interpretation";
import type { StudioProductionBrief } from "@/types/studio-production-brief";
import type {
  StudioProductionBriefSelections,
  StudioStoryPlan,
  StudioStoryPlanScene,
} from "@/types/studio-production-brief-v3";

export function buildStoryPlanFromInterpretation(input: {
  interpretation: StudioStoryInterpretation;
  selections: StudioProductionBriefSelections;
  brief?: StudioProductionBrief;
}): StudioStoryPlan {
  const { interpretation, selections } = input;
  const perScene = Math.floor(
    (input.brief?.estimatedDurationSeconds ?? 30) / Math.max(1, interpretation.scenes.length)
  );
  const scenes: StudioStoryPlanScene[] = interpretation.scenes.map((scene, index) => ({
    id: scene.id,
    index: index + 1,
    title: scene.title,
    purpose: scene.purpose,
    description: scene.visualIdea,
    dialogue: selections.narrative.includes("characters") ? scene.visualIdea : "",
    voiceOver: selections.narrative.includes("narrator") ? scene.visualIdea : "",
    location: input.brief?.recommendedLocations[index]?.name ?? "Main location",
    requiredAssets: scene.characters,
    durationSeconds: perScene,
  }));

  const direction = interpretation.directions.find(
    (d) => d.id === interpretation.selectedDirectionId
  );

  return {
    logline: interpretation.interpretation,
    storyStructure: `${interpretation.narrativeType} — ${direction?.summary ?? interpretation.coreConcept}`,
    scenes,
    characterNotes: interpretation.scenes.flatMap((s) => s.characters),
    voiceOverProposal: scenes.map((s) => s.voiceOver).filter(Boolean).join(" "),
    locationNotes: input.brief?.recommendedLocations.map((l) => l.name) ?? [],
    assetRequirements: [`concept: ${interpretation.coreConcept}`, `audience: ${interpretation.audience}`],
    builtAt: new Date().toISOString(),
  };
}

export function buildStoryPlanFromBrief(input: {
  brief: StudioProductionBrief;
  selections: StudioProductionBriefSelections;
  locale?: string;
}): StudioStoryPlan {
  const enrichedIdea = [
    input.brief.idea,
    input.brief.goal,
    input.selections.tones.join(", "),
    input.selections.narrative.join(", "),
  ]
    .filter(Boolean)
    .join(" — ");

  const v4 = input.selections as { emotions?: string[]; visualStyles?: string[] };
  const storyline = buildStudioStorylineFromIdea(enrichedIdea, {
    emotions: v4.emotions ?? input.selections.tones,
    visualStyles: v4.visualStyles ?? [],
    audience: input.selections.audience,
    locale: input.locale,
  });
  const sceneCount = Math.max(storyline.scenes.length, input.brief.storyPreview.estimatedSceneCount);
  const perScene = Math.floor(input.brief.estimatedDurationSeconds / Math.max(1, sceneCount));

  const scenes: StudioStoryPlanScene[] = storyline.scenes.map((scene, index) => ({
    id: scene.id,
    index: index + 1,
    title: scene.title,
    purpose: input.selections.goals[0] ?? "promote",
    description: scene.visualDescription,
    dialogue:
      input.selections.narrative.includes("characters") || input.selections.narrative.includes("both")
        ? scene.script
        : "",
    voiceOver:
      input.selections.narrative.includes("narrator") || input.selections.narrative.includes("both")
        ? scene.script
        : "",
    location: input.brief.recommendedLocations[index]?.name ?? input.brief.world?.name ?? "Main location",
    requiredAssets: [
      ...(input.brief.mainCharacters[index] ? [input.brief.mainCharacters[index]!.name] : []),
      ...(input.brief.recommendedProps[index] ? [input.brief.recommendedProps[index]!.name] : []),
    ].filter(Boolean),
    durationSeconds: perScene,
  }));

  return {
    logline: storyline.logline,
    storyStructure: storyline.summary,
    scenes,
    characterNotes: input.brief.mainCharacters.map((c) => c.name),
    voiceOverProposal: storyline.scenes.map((s) => s.script).join(" "),
    locationNotes: input.brief.recommendedLocations.map((l) => l.name),
    assetRequirements: storyline.assetRequirements.map((a) => `${a.kind}: ${a.label}`),
    builtAt: new Date().toISOString(),
  };
}

export function regenerateStoryPlanScene(
  plan: StudioStoryPlan,
  sceneId: string,
  mode: "shorter" | "emotional" | "commercial" = "commercial"
): StudioStoryPlan {
  const scenes = plan.scenes.map((scene) => {
    if (scene.id !== sceneId) return scene;
    const suffix =
      mode === "shorter" ? " (condensed)"
      : mode === "emotional" ? " — emotional beat"
      : " — commercial focus";
    return {
      ...scene,
      description: `${scene.description}${suffix}`,
      voiceOver: mode === "shorter" ? scene.voiceOver.split(" ").slice(0, 12).join(" ") : scene.voiceOver,
    };
  });
  return { ...plan, scenes, builtAt: new Date().toISOString() };
}

export function removeStoryPlanScene(plan: StudioStoryPlan, sceneId: string): StudioStoryPlan {
  const scenes = plan.scenes.filter((s) => s.id !== sceneId).map((s, i) => ({ ...s, index: i + 1 }));
  return { ...plan, scenes, builtAt: new Date().toISOString() };
}
