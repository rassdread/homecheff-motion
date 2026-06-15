import type { StudioProductionBrief } from "@/types/studio-production-brief";
import type { StudioProductionBriefSelections } from "@/types/studio-production-brief-v3";
import type {
  StudioV10DialogueLine,
  StudioV10InterpretationSummary,
  StudioV10NarrativeMode,
  StudioV10OverlayPlan,
  StudioV10SceneProposal,
  StudioV10SceneVoiceAssignment,
  StudioV10StoryArcBeat,
  StudioV10StoryPlanningState,
  StudioV10VoiceOverLine,
} from "@/types/studio-v10-story-planning";
import type { StudioStoryInterpretation } from "@/lib/studio-story-interpretation";
import { calculateStudioV10Runtime } from "@/lib/studio-v10-runtime-intelligence";

function localeFrom(input?: string): "nl" | "en" {
  return input?.toLowerCase().startsWith("nl") ? "nl" : "en";
}

function narrativeModeFromSelections(
  selections: StudioProductionBriefSelections
): StudioV10NarrativeMode {
  const narrative = selections.narrative[0] ?? "both";
  if (narrative === "narrator") return "voice_over_only";
  if (narrative === "characters") return "dialogue_only";
  if (narrative === "both") return "voice_over_and_dialogue";
  return "voice_over_and_dialogue";
}

function buildStoryArc(locale: "nl" | "en", idea: string): StudioV10StoryArcBeat[] {
  const lower = idea.toLowerCase();
  const rotterdam = lower.includes("rotterdam");
  if (locale === "nl") {
    return [
      {
        id: "arc_opening",
        phase: "opening",
        label: "Opening",
        summary: rotterdam ? "Sergio start zijn wandeling op Rotterdam Blaak." : "De hoofdpersoon begint de reis.",
      },
      {
        id: "arc_conflict",
        phase: "conflict",
        label: "Conflict / probleem",
        summary: "Er ontbreekt nog iets — verbinding of momentum.",
      },
      {
        id: "arc_development",
        phase: "development",
        label: "Ontwikkeling",
        summary: "Ontmoetingen voegen nieuwe personages en energie toe.",
      },
      {
        id: "arc_resolution",
        phase: "resolution",
        label: "Oplossing",
        summary: "Het team komt samen; de community voelt levend.",
      },
      {
        id: "arc_cta",
        phase: "cta",
        label: "CTA",
        summary: "Slot met duidelijke call-to-action voor HomeCheff.",
      },
    ];
  }
  return [
    {
      id: "arc_opening",
      phase: "opening",
      label: "Opening",
      summary: rotterdam ? "Sergio starts walking through Rotterdam Blaak." : "The hero begins the journey.",
    },
    {
      id: "arc_conflict",
      phase: "conflict",
      label: "Conflict / problem",
      summary: "Something is still missing — connection or momentum.",
    },
    {
      id: "arc_development",
      phase: "development",
      label: "Development",
      summary: "Encounters add characters and energy.",
    },
    {
      id: "arc_resolution",
      phase: "resolution",
      label: "Resolution",
      summary: "The team comes together; community feels alive.",
    },
    {
      id: "arc_cta",
      phase: "cta",
      label: "CTA",
      summary: "Closing beat with a clear HomeCheff call-to-action.",
    },
  ];
}

function overlayForScene(
  sceneId: string,
  index: number,
  locale: "nl" | "en",
  title: string
): StudioV10OverlayPlan {
  const headers =
    locale === "nl"
      ? ["DE REIS", "DE EERSTE VERBINDING", "SAMEN VERDER", "DE BEWEGING", "JOIN HOMECHEFF"]
      : ["THE JOURNEY", "THE FIRST CONNECTION", "MOVING TOGETHER", "THE MOVEMENT", "JOIN HOMECHEFF"];
  const subtitles =
    locale === "nl"
      ? [
          "Elke reis begint ergens",
          "Gelijkgestemden vinden elkaar",
          "Een groeiende community",
          "Iedereen beweegt mee",
          "Begin vandaag",
        ]
      : [
          "Every journey starts somewhere",
          "Like-minded people find each other",
          "A growing community",
          "Everyone moves together",
          "Start today",
        ];
  return {
    sceneId,
    header: headers[index] ?? headers[0],
    title,
    subtitle: subtitles[index] ?? subtitles[0],
    position: index === 0 ? "top" : "center",
    durationSeconds: 4,
  };
}

function voiceOverForScene(index: number, locale: "nl" | "en"): string {
  const nl = [
    "Elke beweging begint met één stap.",
    "De community begint te groeien.",
    "Samen maken we de stad levend.",
    "Iedereen heeft een plek in het verhaal.",
    "Word onderdeel van HomeCheff.",
  ];
  const en = [
    "Every movement begins with one step.",
    "The community begins to grow.",
    "Together we bring the city to life.",
    "Everyone has a place in the story.",
    "Become part of HomeCheff.",
  ];
  const lines = locale === "nl" ? nl : en;
  return lines[index] ?? lines[0]!;
}

function dialogueForScene(
  index: number,
  locale: "nl" | "en",
  sceneId: string
): StudioV10DialogueLine[] {
  if (index !== 1) {
    return [];
  }
  return [
    {
      id: `dlg_${sceneId}_chef`,
      character: locale === "nl" ? "Chef" : "Chef",
      voice: locale === "nl" ? "Nederlandse man vriendelijk" : "Dutch Male Friendly",
      dialogue:
        locale === "nl"
          ? "Sommige mensen delen jouw visie."
          : "Some people share your vision.",
      emotion: locale === "nl" ? "Uitnodigend" : "Inviting",
      sceneId,
      sceneIndex: index + 1,
      timingLabel: `Scene ${index + 1}`,
      enabled: true,
    },
  ];
}

function buildSceneProposals(input: {
  interpretation: StudioStoryInterpretation;
  brief?: StudioProductionBrief;
  locale: "nl" | "en";
  narrativeMode: StudioV10NarrativeMode;
}): StudioV10SceneProposal[] {
  const { interpretation, brief, locale, narrativeMode } = input;
  const locations =
    brief?.recommendedLocations.map((l) => l.name) ??
    (locale === "nl" ? ["Rotterdam Blaak", "Erasmusbrug", "Markthal", "Kop van Zuid"] : ["City center", "Bridge", "Market", "Waterfront"]);

  return interpretation.scenes.map((scene, index) => {
    const sceneId = scene.id;
    const location = locations[index] ?? locations[0] ?? "Main location";
    const characters =
      index === 0
        ? [locale === "nl" ? "Sergio" : "Sergio"]
        : index === 1
          ? [locale === "nl" ? "Sergio + Chef" : "Sergio + Chef"]
          : scene.characters;
    const voiceOver =
      narrativeMode === "dialogue_only" || narrativeMode === "silent"
        ? ""
        : voiceOverForScene(index, locale);
    const dialogueLines =
      narrativeMode === "voice_over_only" || narrativeMode === "silent"
        ? []
        : dialogueForScene(index, locale, sceneId);

    const overlay = overlayForScene(sceneId, index, locale, scene.title);
    const action =
      index === 0
        ? locale === "nl"
          ? "Loopt door de stad"
          : "Walking through the city"
        : index === 1
          ? locale === "nl"
            ? "Eerste ontmoeting"
            : "First meeting"
          : scene.visualIdea;

    return {
      id: sceneId,
      index: index + 1,
      title: scene.title,
      location,
      characters,
      action,
      emotion: scene.emotion,
      purpose: scene.purpose,
      voiceOver,
      dialogueLines,
      overlay,
      estimatedDurationSeconds: 4 + index,
      approved: false,
    };
  });
}

function buildVoiceOverLines(scenes: StudioV10SceneProposal[], locale: "nl" | "en"): StudioV10VoiceOverLine[] {
  return scenes
    .filter((s) => s.voiceOver.trim())
    .map((scene) => ({
      sceneId: scene.id,
      sceneIndex: scene.index,
      script: scene.voiceOver,
      narratorVoice: locale === "nl" ? "Nederlandse verteller warm" : "Warm narrator EN",
      emotion: scene.emotion,
      durationSeconds: Math.max(2.5, scene.voiceOver.split(/\s+/).length * 0.35),
    }));
}

function buildSceneVoiceAssignments(scenes: StudioV10SceneProposal[]): StudioV10SceneVoiceAssignment[] {
  return scenes.map((scene) => {
    const dialogueChar = scene.dialogueLines[0]?.character;
    const speaker = dialogueChar ?? (scene.voiceOver ? "Narrator" : "—");
    return {
      sceneId: scene.id,
      sceneIndex: scene.index,
      speakerLabel: speaker,
      voiceName: dialogueChar ? scene.dialogueLines[0]!.voice : "Narrator",
      voiceProfile: dialogueChar ? "friendly_male_nl" : "warm_narrator",
      emotion: scene.emotion,
      speed: 1,
      isOverride: false,
    };
  });
}

export function buildInterpretationSummary(input: {
  interpretation: StudioStoryInterpretation;
  brief?: StudioProductionBrief;
  selections: StudioProductionBriefSelections;
  locale?: string;
}): StudioV10InterpretationSummary {
  const locale = localeFrom(input.locale ?? input.interpretation.locale);
  const goalKey = input.selections.goals[0] ?? "promote";
  const goalMapNl: Record<string, string> = {
    sell: "Verkopen",
    explain: "Uitleggen",
    promote: "Promoten",
    story: "Verhaal vertellen",
    social: "Social bereik",
    education: "Educatie",
  };
  const goalMapEn: Record<string, string> = {
    sell: "Sell",
    explain: "Explain",
    promote: "Promote",
    story: "Tell a story",
    social: "Social reach",
    education: "Educate",
  };
  return {
    audience: input.interpretation.audience,
    goal: (locale === "nl" ? goalMapNl : goalMapEn)[goalKey] ?? goalKey,
    emotion: input.interpretation.emotionalDirection,
    narrativeType: input.interpretation.narrativeType,
    cta: locale === "nl" ? "Ontdek HomeCheff" : "Discover HomeCheff",
    mainCharacters: input.brief?.mainCharacters.map((c) => c.name) ?? input.interpretation.scenes.flatMap((s) => s.characters),
    locations: input.brief?.recommendedLocations.map((l) => l.name) ?? [],
    products: input.brief?.recommendedProps.map((p) => p.name) ?? [],
    interpretation: input.interpretation.interpretation,
  };
}

import type { StudioV11DirectorWizardState } from "@/types/studio-v11-director-wizard";

export function buildStudioV10StoryPlanning(input: {
  idea: string;
  interpretation: StudioStoryInterpretation;
  selections: StudioProductionBriefSelections;
  brief?: StudioProductionBrief;
  locale?: string;
  directorWizard?: StudioV11DirectorWizardState;
}): StudioV10StoryPlanningState {
  const locale = localeFrom(input.locale ?? input.interpretation.locale);
  const narrativeMode =
    input.directorWizard?.suggestions.dialogueMode ?? narrativeModeFromSelections(input.selections);
  const interpretation = input.directorWizard
    ? {
        audience: input.directorWizard.suggestions.audience,
        goal: input.directorWizard.suggestions.goal,
        emotion: input.directorWizard.suggestions.emotion,
        narrativeType: input.directorWizard.suggestions.narrativeType,
        cta: input.directorWizard.suggestions.cta,
        mainCharacters: input.directorWizard.suggestions.characters,
        locations: input.directorWizard.suggestions.locations,
        products: input.directorWizard.suggestions.products,
        interpretation: buildInterpretationSummary({
          interpretation: input.interpretation,
          brief: input.brief,
          selections: input.selections,
          locale,
        }).interpretation,
      }
    : buildInterpretationSummary({
        interpretation: input.interpretation,
        brief: input.brief,
        selections: input.selections,
        locale,
      });
  const storyArc = buildStoryArc(locale, input.idea);
  const sceneProposals = buildSceneProposals({
    interpretation: input.interpretation,
    brief: input.brief,
    locale,
    narrativeMode,
  });
  const voiceOverLines = buildVoiceOverLines(sceneProposals, locale);
  const dialogueLines = sceneProposals.flatMap((s) => s.dialogueLines);
  const overlayPlans = sceneProposals.map((s) => s.overlay);
  const sceneVoiceAssignments = buildSceneVoiceAssignments(sceneProposals);
  const runtime = calculateStudioV10Runtime({
    scenes: sceneProposals,
    voiceOverLines,
    dialogueLines,
    transitionCount: Math.max(0, sceneProposals.length - 1),
  });

  const now = new Date().toISOString();
  return {
    version: 1,
    locale,
    interpretation,
    interpretationConfirmed: false,
    narrativeMode,
    storyArc,
    sceneProposals,
    dialogueLines,
    voiceOverLines,
    overlayPlans,
    sceneVoiceAssignments,
    runtime,
    userApproved: false,
    builtAt: now,
    updatedAt: now,
  };
}

function mergeSceneVoiceAssignments(
  scenes: StudioV10SceneProposal[],
  existing: StudioV10SceneVoiceAssignment[]
): StudioV10SceneVoiceAssignment[] {
  const base = buildSceneVoiceAssignments(scenes);
  return base.map((assignment) => {
    const prev = existing.find((e) => e.sceneId === assignment.sceneId);
    if (!prev?.isOverride) {
      return assignment;
    }
    return {
      ...assignment,
      voiceAssetId: prev.voiceAssetId,
      voiceProfile: prev.voiceProfile ?? assignment.voiceProfile,
      voiceName: prev.voiceName ?? assignment.voiceName,
      emotion: prev.emotion ?? assignment.emotion,
      speed: prev.speed ?? assignment.speed,
      speakerLabel: prev.speakerLabel ?? assignment.speakerLabel,
      isOverride: true,
    };
  });
}

function syncV10PlanningDerived(
  state: StudioV10StoryPlanningState,
  sceneProposals: StudioV10SceneProposal[]
): StudioV10StoryPlanningState {
  const voiceOverLines = buildVoiceOverLines(sceneProposals, state.locale);
  const dialogueLines = sceneProposals.flatMap((s) => s.dialogueLines);
  const overlayPlans = sceneProposals.map((s) => s.overlay);
  const sceneVoiceAssignments = mergeSceneVoiceAssignments(sceneProposals, state.sceneVoiceAssignments);
  const runtime = calculateStudioV10Runtime({
    scenes: sceneProposals,
    voiceOverLines,
    dialogueLines,
    transitionCount: Math.max(0, sceneProposals.length - 1),
  });
  return {
    ...state,
    sceneProposals,
    voiceOverLines,
    dialogueLines,
    overlayPlans,
    sceneVoiceAssignments,
    runtime,
    updatedAt: new Date().toISOString(),
  };
}

const DIALOGUE_ALTERNATES_NL = [
  "Sommige mensen delen jouw visie.",
  "Welkom bij HomeCheff.",
  "Laten we samen iets moois bouwen.",
];
const DIALOGUE_ALTERNATES_EN = [
  "Some people share your vision.",
  "Welcome to HomeCheff.",
  "Let's build something beautiful together.",
];

export function applyNarrativeMode(
  state: StudioV10StoryPlanningState,
  mode: StudioV10NarrativeMode
): StudioV10StoryPlanningState {
  const sceneProposals = state.sceneProposals.map((scene) => {
    const voiceOver =
      mode === "dialogue_only" || mode === "silent" ? "" : voiceOverForScene(scene.index - 1, state.locale);
    const dialogueLines =
      mode === "voice_over_only" || mode === "silent"
        ? []
        : dialogueForScene(scene.index - 1, state.locale, scene.id);
    return { ...scene, voiceOver, dialogueLines };
  });
  return syncV10PlanningDerived({ ...state, narrativeMode: mode }, sceneProposals);
}

export function patchV10SceneProposal(
  state: StudioV10StoryPlanningState,
  sceneId: string,
  patch: Partial<StudioV10SceneProposal>
): StudioV10StoryPlanningState {
  const sceneProposals = state.sceneProposals.map((s) => (s.id === sceneId ? { ...s, ...patch } : s));
  return syncV10PlanningDerived(state, sceneProposals);
}

export function confirmV10Interpretation(state: StudioV10StoryPlanningState): StudioV10StoryPlanningState {
  return {
    ...state,
    interpretationConfirmed: true,
    updatedAt: new Date().toISOString(),
  };
}

export function patchV10DialogueLine(
  state: StudioV10StoryPlanningState,
  dialogueId: string,
  patch: Partial<StudioV10DialogueLine>
): StudioV10StoryPlanningState {
  const sceneProposals = state.sceneProposals.map((scene) => ({
    ...scene,
    dialogueLines: scene.dialogueLines.map((line) =>
      line.id === dialogueId ? { ...line, ...patch } : line
    ),
  }));
  return syncV10PlanningDerived(state, sceneProposals);
}

export function toggleV10DialogueLine(
  state: StudioV10StoryPlanningState,
  dialogueId: string
): StudioV10StoryPlanningState {
  const line = state.dialogueLines.find((d) => d.id === dialogueId);
  if (!line) {
    return state;
  }
  return patchV10DialogueLine(state, dialogueId, { enabled: !line.enabled });
}

export function regenerateV10DialogueLine(
  state: StudioV10StoryPlanningState,
  dialogueId: string
): StudioV10StoryPlanningState {
  const line = state.dialogueLines.find((d) => d.id === dialogueId);
  if (!line) {
    return state;
  }
  const alternates = state.locale === "nl" ? DIALOGUE_ALTERNATES_NL : DIALOGUE_ALTERNATES_EN;
  const currentIndex = alternates.findIndex((text) => text === line.dialogue);
  const nextDialogue = alternates[(currentIndex + 1) % alternates.length] ?? alternates[0]!;
  return patchV10DialogueLine(state, dialogueId, { dialogue: nextDialogue, enabled: true });
}

export function patchV10OverlayPlan(
  state: StudioV10StoryPlanningState,
  sceneId: string,
  patch: Partial<StudioV10OverlayPlan>
): StudioV10StoryPlanningState {
  const sceneProposals = state.sceneProposals.map((scene) =>
    scene.id === sceneId ? { ...scene, overlay: { ...scene.overlay, ...patch, sceneId } } : scene
  );
  return syncV10PlanningDerived(state, sceneProposals);
}

export function patchV10VoiceOverLine(
  state: StudioV10StoryPlanningState,
  sceneId: string,
  patch: Partial<Pick<StudioV10VoiceOverLine, "script" | "narratorVoice" | "emotion">>
): StudioV10StoryPlanningState {
  const sceneProposals = state.sceneProposals.map((scene) =>
    scene.id === sceneId && patch.script !== undefined ? { ...scene, voiceOver: patch.script } : scene
  );
  const next = syncV10PlanningDerived(state, sceneProposals);
  const voiceOverLines = next.voiceOverLines.map((line) =>
    line.sceneId === sceneId ? { ...line, ...patch } : line
  );
  const runtime = calculateStudioV10Runtime({
    scenes: next.sceneProposals,
    voiceOverLines,
    dialogueLines: next.dialogueLines,
    transitionCount: Math.max(0, next.sceneProposals.length - 1),
  });
  return { ...next, voiceOverLines, runtime, updatedAt: new Date().toISOString() };
}

export function patchV10SceneVoiceAssignment(
  state: StudioV10StoryPlanningState,
  sceneId: string,
  patch: Partial<StudioV10SceneVoiceAssignment>
): StudioV10StoryPlanningState {
  const sceneVoiceAssignments = state.sceneVoiceAssignments.map((row) =>
    row.sceneId === sceneId ? { ...row, ...patch, isOverride: true } : row
  );
  return {
    ...state,
    sceneVoiceAssignments,
    updatedAt: new Date().toISOString(),
  };
}

export function approveV10StoryPlanning(state: StudioV10StoryPlanningState): StudioV10StoryPlanningState {
  return {
    ...state,
    interpretationConfirmed: true,
    userApproved: true,
    sceneProposals: state.sceneProposals.map((s) => ({ ...s, approved: true })),
    updatedAt: new Date().toISOString(),
  };
}

export function v10PlanningToStoryPlanPatch(state: StudioV10StoryPlanningState) {
  return {
    scenes: state.sceneProposals.map((scene) => ({
      id: scene.id,
      index: scene.index,
      title: scene.title,
      purpose: scene.purpose,
      description: scene.action,
      dialogue: scene.dialogueLines.map((d) => `${d.character}: "${d.dialogue}"`).join("\n"),
      voiceOver: scene.voiceOver,
      location: scene.location,
      requiredAssets: scene.characters,
      durationSeconds: scene.estimatedDurationSeconds,
    })),
    voiceOverProposal: state.voiceOverLines.map((v) => v.script).join(" "),
    builtAt: new Date().toISOString(),
  };
}
