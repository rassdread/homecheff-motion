/**
 * Assistant V3 — context-aware creative copilot (intent → context → reasoning → recommendation → execution).
 */

import type { AssistantActionId } from "@/lib/assistant-action-registry";
import { buildAssistantActionRoute } from "@/lib/assistant-route-builder";
import type {
  AssistantContextSnapshot,
  AssistantProjectContext,
} from "@/lib/assistant-context-layer";
import { buildEditorMorphActionRoute, type EditorMorphActionId } from "@/lib/editor-morph-actions";
import { resolveVisionTaxonomy } from "@/lib/editor-vision-taxonomy";
import type { AssistantSessionMemory } from "@/lib/assistant-session-memory";
import type { AssistantStudioContext } from "@/types/assistant-studio-brain";
import type {
  AssistantAssetState,
  AssistantAssetType,
  AssistantEditorContextHint,
  AssistantV3ActionGroup,
  AssistantV3AssetContext,
  AssistantV3CopilotInsight,
  AssistantV3CopilotResponse,
  AssistantV3DynamicAction,
  AssistantV3PartContext,
  AssistantV3ProductionStep,
  AssistantV3ProjectInsight,
  AssistantV3QualityAudit,
  AssistantV3ReasoningProfile,
  AssistantV3SessionMemory,
  AssistantV3TurnResult,
} from "@/types/assistant-v3";
import { resolveAssistantReasoningProfile } from "@/lib/assistant-editor-context-builder";
import { resolveEditorAwareMessage } from "@/lib/assistant-v3-pronoun-resolution";
import { buildPartSpecificActionGroups } from "@/lib/assistant-v3-part-actions";
import { answerExpandedStudioKnowledge } from "@/lib/assistant-v3-studio-knowledge";
import {
  buildCreativeDirectorInsights,
  enhanceProjectWorkflowInsight,
} from "@/lib/assistant-v3-workflow-reasoning";
import type { ProducerResponse } from "@/types/assistant-producer";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";
import type { StudioPricingCatalogPublicEntry } from "@/types/studio-pricing-catalog";

export type AssistantV3TurnInput = {
  message: string;
  locale: "nl" | "en";
  memory: AssistantSessionMemory;
  snapshot: AssistantContextSnapshot;
  studio: AssistantStudioContext;
  activeProject: AssistantProjectContext | null;
  editorContext?: AssistantEditorContextHint | null;
  libraryRecords?: LibraryConsistencyRecord[];
  pricingCatalog?: StudioPricingCatalogPublicEntry[];
  pathname?: string;
};

function nl(locale: "nl" | "en", nlText: string, enText: string): string {
  return locale === "en" ? enText : nlText;
}

function action(
  id: string,
  label: string,
  promptMessage: string,
  extra?: Partial<AssistantV3DynamicAction>
): AssistantV3DynamicAction {
  return { id, label, promptMessage, ...extra };
}

function inferAssetTypeFromSignals(input: {
  name: string;
  generationType?: string;
  category?: string;
  editorHint?: AssistantEditorContextHint | null;
}): AssistantAssetType {
  if (input.editorHint?.selectedAssetType) {
    return input.editorHint.selectedAssetType;
  }
  const text = `${input.name} ${input.generationType ?? ""} ${input.category ?? ""}`.toLowerCase();
  if (/globe\s*man|mascot|chef|garden|designer/.test(text)) {
    return "mascot";
  }
  if (/character|personage/.test(text)) {
    return "character";
  }
  if (/dog|cat|pet|animal|horse|bird/.test(text)) {
    return "animal";
  }
  if (/human|portrait|selfie|person/.test(text)) {
    return "human";
  }
  if (/world|universe/.test(text)) {
    return "world";
  }
  if (/location|scene|background/.test(text)) {
    return "location";
  }
  if (/prop|object|tool/.test(text)) {
    return "prop";
  }
  if (/logo|brand/.test(text)) {
    return "logo";
  }
  if (/video|motion|clip/.test(text)) {
    return "video";
  }
  if (input.generationType === "motion_output") {
    return "video";
  }
  if (input.generationType === "character" || input.generationType === "mascot") {
    return "mascot";
  }
  return "image";
}

function inferAssetState(record?: LibraryConsistencyRecord): AssistantAssetState {
  if (!record) {
    return "new";
  }
  if (record.backingStore === "user_upload") {
    return "imported";
  }
  if (/draft|concept/i.test(record.assetName ?? "")) {
    return "draft";
  }
  return "generated";
}

export function resolveAssistantV3AssetContext(input: AssistantV3TurnInput): AssistantV3AssetContext | null {
  const editor = input.editorContext;
  const v3 = input.memory.v3;
  const records = input.libraryRecords ?? [];

  let assetId = input.memory.selectedAssetId;
  let assetName =
    editor?.selectedAssetName ??
    editor?.documentName ??
    v3?.selectedAssetName ??
    input.memory.conversationMemory?.lastCharacter ??
    null;

  if (!assetName && assetId) {
    const match = records.find((r) => r.registryAssetId === assetId);
    assetName = match?.assetName ?? null;
  }

  if (!assetName && input.studio.route.module === "editor" && editor?.documentName) {
    assetName = editor.documentName;
  }

  if (!assetName) {
    const mascot = input.snapshot.library.characters.find((row) =>
      /globe\s*man|mascot|chef|garden|designer/i.test(row.assetName)
    );
    if (mascot && /editor|mascot|globe|character|bewerk|edit/i.test(input.message)) {
      assetId = mascot.registryAssetId;
      assetName = mascot.assetName;
    }
  }

  if (!assetName) {
    return null;
  }

  const record = assetId ? records.find((r) => r.registryAssetId === assetId) : undefined;
  const assetType = inferAssetTypeFromSignals({
    name: assetName,
    generationType: record?.generationType,
    category: record?.category,
    editorHint: editor,
  });

  const taxonomyType =
    editor?.taxonomyType ??
    v3?.taxonomyType ??
    resolveVisionTaxonomy({
      vision: {
        objectType:
          assetType === "mascot"
            ? "mascot"
            : assetType === "human"
              ? "human"
              : assetType === "animal"
                ? "animal"
                : assetType === "character"
                  ? "character"
                  : "illustration",
        objectTypeLabel: assetName,
        visualStyle: "",
        colors: [],
        shapeLanguage: [],
        keyFeatures: [assetName.toLowerCase()],
        brandIdentity: "",
        materialHints: "",
        environmentHints: "",
        suggestedPreserve: [],
        suggestedChange: [],
        suggestedForbidden: [],
        confidence: 0.7,
        safetyNotes: [],
        assetFamily: "",
        characterLineage: "",
        brandRecognitionConfidence: 0.5,
        identityFingerprint: {
          fingerprintHash: "assistant-v3",
          identityShapeMarkers: [],
          accessoryPattern: "",
          silhouette: "",
        },
      } as AssetVisionAnalysis,
      documentName: assetName,
    })?.type ??
    null;

  return {
    assetId: assetId ?? record?.registryAssetId ?? null,
    assetName,
    assetType,
    assetState: inferAssetState(record),
    taxonomyType,
    selectedParts: editor?.selectedHierarchyPath ?? editor?.selectedParts ?? [],
    partContext: resolveAssistantV3PartContext(input, assetName),
  };
}

export function resolveAssistantV3PartContext(
  input: AssistantV3TurnInput,
  assetName?: string
): AssistantV3PartContext | null {
  const editor = input.editorContext;
  const v3 = input.memory.v3;
  const partName = editor?.selectedPartName ?? v3?.selectedPartName ?? null;
  if (!partName?.trim()) {
    return null;
  }
  const partGroup = editor?.selectedPartGroup ?? v3?.selectedPartGroup ?? "appearance";
  const hierarchyPath =
    editor?.selectedHierarchyPath ??
    v3?.selectedHierarchyPath ??
    (partName ? [assetName ?? editor?.selectedAssetName ?? "Asset", partName] : []);

  return {
    partId: editor?.selectedPartId ?? v3?.selectedPartId ?? null,
    partName,
    partGroup,
    hierarchyPath,
    assetName: assetName ?? editor?.selectedAssetName ?? v3?.selectedAssetName ?? "Asset",
  };
}

function buildMascotActionGroups(assetName: string, locale: "nl" | "en"): AssistantV3ActionGroup[] {
  const subject = assetName;
  return [
    {
      id: "appearance",
      label: nl(locale, "Uiterlijk", "Appearance"),
      actions: [
        action("face", nl(locale, "Gezicht aanpassen", "Adjust face"), `Pas het gezicht van ${subject} aan`),
        action("eyes", nl(locale, "Ogen aanpassen", "Adjust eyes"), `Pas de ogen van ${subject} aan`),
        action("mouth", nl(locale, "Mond aanpassen", "Adjust mouth"), `Pas de mond van ${subject} aan`),
        action("outfit", nl(locale, "Outfit aanpassen", "Adjust outfit"), `Pas de outfit van ${subject} aan`),
      ],
    },
    {
      id: "expression",
      label: nl(locale, "Expressie", "Expression"),
      actions: [
        action("expr_happy", nl(locale, "Blij", "Happy"), `Maak ${subject} blij`),
        action("expr_serious", nl(locale, "Serieus", "Serious"), `Maak ${subject} serieus`),
        action("expr_enthusiastic", nl(locale, "Enthousiast", "Enthusiastic"), `Maak ${subject} enthousiast`),
      ],
    },
    {
      id: "pose",
      label: nl(locale, "Pose", "Pose"),
      actions: [
        action("pose_standing", nl(locale, "Staand", "Standing"), `Zet ${subject} in een staande pose`),
        action("pose_walking", nl(locale, "Lopend", "Walking"), `Zet ${subject} in een lopende pose`),
        action("pose_presenting", nl(locale, "Presenterend", "Presenting"), `Laat ${subject} presenteren`),
      ],
    },
    {
      id: "morph",
      label: nl(locale, "Morph", "Morph"),
      actions: [
        action(
          "morph_cartoon",
          nl(locale, "Cartoon", "Cartoon"),
          `Maak ${subject} cartoon`,
          { morphActionId: "mascot_style_morph", route: buildEditorMorphActionRoute("mascot_style_morph") }
        ),
        action(
          "morph_cinematic",
          nl(locale, "Cinematisch", "Cinematic"),
          `Maak ${subject} cinematischer`,
          { morphActionId: "human_to_cinematic_character", route: buildEditorMorphActionRoute("human_to_cinematic_character") }
        ),
        action("variant_chef", nl(locale, "Chef-variant", "Chef variant"), `Maak een chef-variant van ${subject}`),
        action("variant_garden", nl(locale, "Garden-variant", "Garden variant"), `Maak een garden-variant van ${subject}`),
        action("variant_designer", nl(locale, "Designer-variant", "Designer variant"), `Maak een designer-variant van ${subject}`),
      ],
    },
  ];
}

function buildHumanActionGroups(assetName: string, locale: "nl" | "en"): AssistantV3ActionGroup[] {
  return [
    {
      id: "face",
      label: nl(locale, "Gezicht", "Face"),
      actions: [
        action("face", nl(locale, "Gezicht", "Face"), `Pas het gezicht van ${assetName} aan`),
        action("hair", nl(locale, "Haar", "Hair"), `Pas het haar van ${assetName} aan`),
        action("expression", nl(locale, "Expressie", "Expression"), `Verander de expressie van ${assetName}`),
      ],
    },
    {
      id: "outfit",
      label: nl(locale, "Outfit", "Outfit"),
      actions: [
        action(
          "outfit",
          nl(locale, "Outfit wisselen", "Change outfit"),
          `Wissel de outfit van ${assetName}`,
          { morphActionId: "outfit_change", route: buildEditorMorphActionRoute("outfit_change") }
        ),
      ],
    },
    {
      id: "morph",
      label: nl(locale, "Morph", "Morph"),
      actions: [
        action(
          "cartoon",
          nl(locale, "Cartoonstijl", "Cartoon style"),
          `Maak ${assetName} cartoon`,
          { morphActionId: "human_to_cartoon", route: buildEditorMorphActionRoute("human_to_cartoon") }
        ),
        action(
          "avatar",
          nl(locale, "Avatar maken", "Create avatar"),
          `Maak een avatar van ${assetName}`,
          { morphActionId: "portrait_to_avatar", route: buildEditorMorphActionRoute("portrait_to_avatar") }
        ),
      ],
    },
  ];
}

function buildAnimalActionGroups(assetName: string, locale: "nl" | "en"): AssistantV3ActionGroup[] {
  return [
    {
      id: "appearance",
      label: nl(locale, "Uiterlijk", "Appearance"),
      actions: [
        action("eyes", nl(locale, "Ogen", "Eyes"), `Pas de ogen van ${assetName} aan`),
        action("fur", nl(locale, "Vacht", "Fur"), `Pas de vacht van ${assetName} aan`),
        action("ears", nl(locale, "Oren", "Ears"), `Pas de oren van ${assetName} aan`),
        action("tail", nl(locale, "Staart", "Tail"), `Pas de staart van ${assetName} aan`),
      ],
    },
    {
      id: "accessories",
      label: nl(locale, "Accessoires", "Accessories"),
      actions: [action("collar", nl(locale, "Halsband", "Collar"), `Pas de halsband van ${assetName} aan`)],
    },
    {
      id: "morph",
      label: nl(locale, "Morph", "Morph"),
      actions: [
        action(
          "cartoon",
          nl(locale, "Cartoon maken", "Make cartoon"),
          `Maak ${assetName} cartoon`,
          { morphActionId: "pet_to_cartoon", route: buildEditorMorphActionRoute("pet_to_cartoon") }
        ),
        action(
          "mascot",
          nl(locale, "Mascotte maken", "Make mascot"),
          `Maak van ${assetName} een mascotte`,
          { morphActionId: "pet_to_mascot", route: buildEditorMorphActionRoute("pet_to_mascot") }
        ),
      ],
    },
  ];
}

export function buildDynamicActionGroups(
  asset: AssistantV3AssetContext,
  locale: "nl" | "en",
  partContext?: AssistantV3PartContext | null
): AssistantV3ActionGroup[] {
  if (partContext?.partName) {
    const partGroups = buildPartSpecificActionGroups(partContext, asset, locale);
    if (partGroups.length > 0) {
      return partGroups;
    }
  }

  if (asset.taxonomyType === "mascot" || asset.assetType === "mascot" || asset.assetType === "character") {
    return buildMascotActionGroups(asset.assetName, locale);
  }
  if (asset.taxonomyType === "human" || asset.assetType === "human") {
    return buildHumanActionGroups(asset.assetName, locale);
  }
  if (asset.taxonomyType === "animal" || asset.assetType === "animal") {
    return buildAnimalActionGroups(asset.assetName, locale);
  }
  return [];
}

export function analyzeProjectCompletion(
  input: AssistantV3TurnInput
): AssistantV3ProjectInsight | null {
  const project = input.activeProject ?? input.studio.project;
  if (!project) {
    return null;
  }

  const scoped = input.snapshot.library;
  const voiceCount = scoped.voice.filter((r) => r.projectId === project.id).length;
  const videoCount = project.assetStats.videoCount;
  const exportCount = project.assetStats.exportCount;
  const characterCount = project.assetStats.characterCount;
  const sceneCountEstimate = project.storyboardId ? Math.max(3, videoCount + 2) : Math.max(1, videoCount);

  const missing: AssistantV3ProjectInsight["missing"] = [];
  if (characterCount === 0) {
    missing.push("characters");
  }
  if (voiceCount === 0 && videoCount > 0) {
    missing.push("voice");
  }
  if (videoCount === 0) {
    missing.push("scenes");
  }
  if (exportCount === 0 && videoCount > 0) {
    missing.push("export");
  }

  let recommendedNextStep = nl(
    input.locale,
    "Bekijk de projectstatus en kies de volgende stap.",
    "Review project status and pick the next step."
  );
  let recommendedActionId: AssistantActionId | undefined;
  let recommendedRoute: string | undefined;

  if (missing.includes("voice")) {
    recommendedNextStep = nl(input.locale, "Genereer voice-over.", "Generate voice-over.");
    recommendedActionId = "prepare_music";
    recommendedRoute = buildAssistantActionRoute("prepare_music", { projectId: project.id });
  } else if (missing.includes("characters")) {
    recommendedNextStep = nl(input.locale, "Maak of koppel personages.", "Create or link characters.");
    recommendedActionId = "create_character";
    recommendedRoute = buildAssistantActionRoute("create_character", { projectId: project.id });
  } else if (missing.includes("scenes")) {
    recommendedNextStep = nl(input.locale, "Genereer scènes of start Motion.", "Generate scenes or start Motion.");
    recommendedActionId = "create_motion_video";
    recommendedRoute = buildAssistantActionRoute("create_motion_video", { projectId: project.id });
  } else if (missing.includes("export")) {
    recommendedNextStep = nl(input.locale, "Publiceer of exporteer de video.", "Publish or export the video.");
    recommendedActionId = "create_publish_export";
    recommendedRoute = buildAssistantActionRoute("create_publish_export", { projectId: project.id });
  }

  return {
    projectId: project.id,
    title: project.title,
    sceneCountEstimate,
    characterCount,
    voiceCount,
    subtitleCount: 0,
    videoCount,
    exportCount,
    missing,
    recommendedNextStep,
    recommendedActionId,
    recommendedRoute,
  };
}

function buildSeriesProductionPlan(locale: "nl" | "en"): AssistantV3ProductionStep[] {
  return [
    {
      id: "characters",
      label: nl(locale, "Personages maken", "Create characters"),
      promptMessage: nl(locale, "Maak de hoofdpersonages voor mijn animatieserie", "Create the main characters for my animation series"),
      actionId: "create_character",
    },
    {
      id: "world",
      label: nl(locale, "Wereld opzetten", "Build world"),
      promptMessage: nl(locale, "Maak een wereld voor mijn animatieserie", "Create a world for my animation series"),
    },
    {
      id: "locations",
      label: nl(locale, "Terugkerende locaties", "Recurring locations"),
      promptMessage: nl(locale, "Maak terugkerende locaties voor mijn serie", "Create recurring locations for my series"),
    },
    {
      id: "voices",
      label: nl(locale, "Stemmen maken", "Create voices"),
      promptMessage: nl(locale, "Maak stemmen voor mijn animatieserie", "Create voices for my animation series"),
    },
    {
      id: "episodes",
      label: nl(locale, "Afleveringen structureren", "Structure episodes"),
      promptMessage: nl(locale, "Structureer afleveringen voor mijn animatieserie", "Structure episodes for my animation series"),
      actionId: "create_motion_video",
    },
    {
      id: "pilot",
      label: nl(locale, "Pilot renderen", "Render pilot"),
      promptMessage: nl(locale, "Render een pilot voor mijn animatieserie", "Render a pilot for my animation series"),
      actionId: "create_motion_video",
    },
  ];
}

function answerStudioKnowledge(message: string, locale: "nl" | "en"): string | null {
  const text = message.toLowerCase();
  if (/verschil.*(motion|studio)|motion.*vs.*studio|what.*difference.*motion/.test(text)) {
    return nl(
      locale,
      "Studio is je creatieve werkplaats voor personages, werelden, storyboards en assets. Motion zet die assets om in bewegende clips en renders. Editor is voor beeldbewerking, morphs en fusion.",
      "Studio is your creative workshop for characters, worlds, storyboards, and assets. Motion turns those assets into moving clips and renders. Editor is for image editing, morphs, and fusion."
    );
  }
  if (/wat is (studio|motion|editor|library)/.test(text) || /what is (studio|motion|editor)/.test(text)) {
    if (text.includes("motion")) {
      return nl(
        locale,
        "Motion genereert video's en animaties vanuit je Studio-assets, met voice, muziek en export.",
        "Motion generates videos and animations from your Studio assets, with voice, music, and export."
      );
    }
    if (text.includes("editor")) {
      return nl(
        locale,
        "Editor is voor beeldbewerking: onderdelen selecteren, morphs, outfits, fusion en export naar Motion.",
        "Editor is for image editing: part selection, morphs, outfits, fusion, and handoff to Motion."
      );
    }
    return nl(
      locale,
      "Studio is het hart van HomeCheff: personages, werelden, locaties, props, voice en storyboards.",
      "Studio is the heart of HomeCheff: characters, worlds, locations, props, voice, and storyboards."
    );
  }
  return null;
}

function buildCopilotInsights(input: AssistantV3TurnInput, asset: AssistantV3AssetContext | null): AssistantV3CopilotInsight[] {
  const insights: AssistantV3CopilotInsight[] = [];
  const project = input.activeProject ?? input.studio.project;

  if (project) {
    const insight = analyzeProjectCompletion(input);
    if (insight?.missing.includes("voice")) {
      insights.push({
        id: "missing_voice",
        message: nl(input.locale, "Je project heeft nog geen voice-over.", "Your project has no voice-over yet."),
        severity: "suggestion",
        optional: true,
      });
    }
    if (insight?.missing.includes("export") && insight.videoCount > 0) {
      insights.push({
        id: "missing_export",
        message: nl(input.locale, "Je video is nog niet gepubliceerd.", "Your video has not been published yet."),
        severity: "info",
        optional: true,
      });
    }
  }

  insights.push(...buildCreativeDirectorInsights(input));

  if (asset?.assetType === "mascot" && /globe\s*man/i.test(asset.assetName)) {
    insights.push({
      id: "globe_man_ready",
      message: nl(
        input.locale,
        "Globe Man heeft uitgebreide bewerkbare onderdelen: gezicht, outfit, expressie en pose.",
        "Globe Man has rich editable parts: face, outfit, expression, and pose."
      ),
      severity: "info",
      optional: true,
    });
  }

  return insights.slice(0, 3);
}

function isFinishProjectRequest(message: string): boolean {
  return /(afmaken|afronden|finish|complete).*(video|project)|(video|project).*(afmaken|afronden|finish|complete)/i.test(
    message
  );
}

function isAnimationSeriesRequest(message: string): boolean {
  return /animatieserie|animation series|serie maken|episodes?/i.test(message);
}

function isAssetGuidanceRequest(message: string): boolean {
  return /(wat kan|what can|hoe pas|how do i|aanpassen|bewerk|edit|wijzig)/i.test(message);
}

function isVrolijkerOrExpressionTweak(message: string): boolean {
  return /(vrolijker|blijer|happier|serieuzer|expressie)/i.test(message);
}

function isPartEditRequest(message: string): boolean {
  return /(groter|kleiner|bigger|smaller|blauw|blue|kleur|color|aanpassen|adjust|deze|dit|this)/i.test(message);
}

export function buildAssistantV3CopilotResponse(input: AssistantV3TurnInput): AssistantV3CopilotResponse {
  const reasoningProfile = resolveAssistantReasoningProfile({
    pathname: input.pathname ?? input.studio.route.pathname,
    editorContext: input.editorContext,
  });
  const asset = resolveAssistantV3AssetContext(input);
  const partContext = asset?.partContext ?? null;
  const rawProjectInsight = isFinishProjectRequest(input.message) ? analyzeProjectCompletion(input) : null;
  const projectInsight = rawProjectInsight ? enhanceProjectWorkflowInsight(rawProjectInsight, input) : null;
  const studioKnowledge =
    answerExpandedStudioKnowledge({
      message: input.message,
      locale: input.locale,
      pricingCatalog: input.pricingCatalog,
    }) ?? answerStudioKnowledge(input.message, input.locale);
  const actionGroups =
    asset && reasoningProfile === "editor"
      ? buildDynamicActionGroups(asset, input.locale, partContext)
      : asset
        ? buildDynamicActionGroups(asset, input.locale)
        : [];
  const insights = buildCopilotInsights(input, asset);
  const productionPlan =
    reasoningProfile === "producer" && isAnimationSeriesRequest(input.message)
      ? buildSeriesProductionPlan(input.locale)
      : null;

  let openingLine = "";
  let body = "";
  let closingQuestion: string | undefined;

  if (partContext && reasoningProfile === "editor") {
    openingLine = nl(
      input.locale,
      `Je bewerkt ${partContext.partName} van ${partContext.assetName}.`,
      `You're editing ${partContext.partName} on ${partContext.assetName}.`
    );
    if (partContext.hierarchyPath.length > 1) {
      body = nl(
        input.locale,
        `Selectie: ${partContext.hierarchyPath.join(" → ")}.`,
        `Selection: ${partContext.hierarchyPath.join(" → ")}.`
      );
    }
    closingQuestion = nl(input.locale, "Wat wil je aan dit onderdeel veranderen?", "What do you want to change on this part?");
  } else if (asset && reasoningProfile === "editor") {
    openingLine = nl(
      input.locale,
      `Ik zie dat je ${asset.assetName} bewerkt.`,
      `I see you're editing ${asset.assetName}.`
    );
    if (actionGroups.length > 0) {
      body = nl(
        input.locale,
        "Je kunt gezicht, outfit, expressie, pose aanpassen of een nieuwe variant maken.",
        "You can change face, outfit, expression, pose, or create a new variant."
      );
      closingQuestion = nl(input.locale, "Wat wil je als eerste aanpassen?", "What would you like to adjust first?");
    }
  }

  if (projectInsight) {
    openingLine = nl(
      input.locale,
      `Je project "${projectInsight.title}" bevat ongeveer ${projectInsight.sceneCountEstimate} scènes, ${projectInsight.characterCount} personages en ${projectInsight.videoCount} video's.`,
      `Your project "${projectInsight.title}" has about ${projectInsight.sceneCountEstimate} scenes, ${projectInsight.characterCount} characters, and ${projectInsight.videoCount} videos.`
    );
    body = nl(
      input.locale,
      `Aanbevolen volgende stap: ${projectInsight.recommendedNextStep}`,
      `Recommended next step: ${projectInsight.recommendedNextStep}`
    );
    if (projectInsight.missing.includes("voice")) {
      body += nl(input.locale, " Voice-over ontbreekt nog.", " Voice-over is still missing.");
    }
    if (projectInsight.missing.includes("subtitles")) {
      body += nl(input.locale, " Ondertitels ontbreken nog.", " Subtitles are still missing.");
    }
  }

  if (studioKnowledge) {
    openingLine = studioKnowledge;
    body = "";
  }

  if (productionPlan) {
    openingLine = nl(
      input.locale,
      "Een animatieserie bouw je stap voor stap op.",
      "You build an animation series step by step."
    );
    body = nl(
      input.locale,
      "Ik stel een productieplan voor met personages, wereld, locaties, stemmen en een pilot.",
      "I suggest a production plan with characters, world, locations, voices, and a pilot."
    );
    closingQuestion = nl(input.locale, "Wil je dat ik een stap start?", "Would you like me to start a step?");
  }

  if (isVrolijkerOrExpressionTweak(input.message) && asset) {
    const target = partContext?.partName ?? asset.assetName;
    openingLine = nl(
      input.locale,
      `Ik pas ${target} aan.`,
      `I'll adjust ${target}.`
    );
    body = nl(input.locale, "Kies een expressie of beschrijf hoe vrolijk het moet worden.", "Pick an expression or describe how cheerful it should be.");
    closingQuestion = undefined;
  }

  if (isPartEditRequest(input.message) && partContext) {
    openingLine = nl(
      input.locale,
      `Ik pas ${partContext.partName} van ${partContext.assetName} aan.`,
      `I'll adjust ${partContext.partName} on ${partContext.assetName}.`
    );
    closingQuestion = undefined;
  }

  if (!openingLine && !body) {
    openingLine = nl(
      input.locale,
      "Ik help je graag verder in HomeCheff Studio.",
      "I'm happy to help you in HomeCheff Studio."
    );
    body = nl(
      input.locale,
      "Vertel wat je wilt maken, bewerken of publiceren — ik stel concrete vervolgstappen voor.",
      "Tell me what you want to create, edit, or publish — I'll suggest concrete next steps."
    );
  }

  return {
    version: 3.5,
    reasoningProfile,
    openingLine,
    body,
    closingQuestion,
    assetContext: asset,
    partContext,
    projectInsight,
    actionGroups,
    insights,
    productionPlan,
    confidence: partContext || asset || projectInsight ? "high" : "medium",
    understoodGoal: input.message.trim(),
  };
}

export function v3ResponseToProducerResponse(v3: AssistantV3CopilotResponse): ProducerResponse {
  const options = v3.actionGroups.flatMap((group) =>
    group.actions.map((row) => ({
      id: row.id,
      label: `${group.label}: ${row.label}`,
      promptMessage: row.promptMessage,
      actionId: row.actionId,
      route: row.route,
    }))
  );

  if (v3.productionPlan) {
    for (const step of v3.productionPlan) {
      options.push({
        id: step.id,
        label: step.label,
        promptMessage: step.promptMessage,
        actionId: step.actionId,
        route: step.actionId ? buildAssistantActionRoute(step.actionId) : undefined,
      });
    }
  }

  if (v3.projectInsight?.recommendedActionId) {
    options.unshift({
      id: "project_next",
      label: v3.projectInsight.recommendedNextStep,
      promptMessage: v3.projectInsight.recommendedNextStep,
      actionId: v3.projectInsight.recommendedActionId,
      route: v3.projectInsight.recommendedRoute,
    });
  }

  const shortReply = [v3.openingLine, v3.body, v3.closingQuestion].filter(Boolean).join(" ");

  return {
    understoodGoal: v3.understoodGoal,
    confidence: v3.confidence,
    shortReply,
    options: options.slice(0, 12),
    questions: v3.closingQuestion ? [v3.closingQuestion] : [],
    suggestedAction: v3.projectInsight?.recommendedActionId,
    suggestedRoute: v3.projectInsight?.recommendedRoute,
    canPrepare: options.length > 0,
    requiresLogin: false,
    missingInputs: [],
    clusterId: "assistant_v3_copilot",
  };
}

export function shouldHandleWithAssistantV3(input: AssistantV3TurnInput): boolean {
  const text = input.message.trim().toLowerCase();
  if (!text) {
    return false;
  }
  const profile = resolveAssistantReasoningProfile({
    pathname: input.pathname ?? input.studio.route.pathname,
    editorContext: input.editorContext,
  });
  if (isFinishProjectRequest(text) || isAnimationSeriesRequest(text)) {
    return true;
  }
  if (
    answerExpandedStudioKnowledge({
      message: text,
      locale: input.locale,
      pricingCatalog: input.pricingCatalog,
    }) ||
    answerStudioKnowledge(text, input.locale)
  ) {
    return true;
  }
  const part = resolveAssistantV3PartContext(input);
  if (part && (isPartEditRequest(text) || profile === "editor")) {
    return true;
  }
  if (resolveAssistantV3AssetContext(input) && (isAssetGuidanceRequest(text) || isVrolijkerOrExpressionTweak(text))) {
    return true;
  }
  if (profile === "editor" && resolveAssistantV3AssetContext(input)) {
    return true;
  }
  if (/^(help|hulp|wat nu|what now)/i.test(text)) {
    return true;
  }
  return false;
}

export function processAssistantV3Turn(input: AssistantV3TurnInput): AssistantV3TurnResult {
  const resolvedMessage = resolveEditorAwareMessage(
    input.message,
    input.editorContext,
    input.memory
  );
  const turnInput = { ...input, message: resolvedMessage };

  if (!shouldHandleWithAssistantV3(turnInput)) {
    return { handled: false };
  }

  const v3Response = buildAssistantV3CopilotResponse(turnInput);
  const asset = v3Response.assetContext;
  const part = v3Response.partContext;
  const profile = v3Response.reasoningProfile;
  const v3Memory: AssistantV3SessionMemory = {
    currentGoal: v3Response.understoodGoal,
    selectedAssetName: asset?.assetName ?? input.memory.v3?.selectedAssetName ?? null,
    selectedAssetType: asset?.assetType ?? input.memory.v3?.selectedAssetType ?? null,
    taxonomyType: asset?.taxonomyType ?? input.memory.v3?.taxonomyType ?? null,
    selectedPartId: part?.partId ?? input.memory.v3?.selectedPartId ?? null,
    selectedPartName: part?.partName ?? input.memory.v3?.selectedPartName ?? null,
    selectedPartGroup: part?.partGroup ?? input.memory.v3?.selectedPartGroup ?? null,
    selectedHierarchyPath: part?.hierarchyPath ?? input.memory.v3?.selectedHierarchyPath,
    recentActionIds: input.memory.v3?.recentActionIds ?? [],
    recentEdits: [
      resolvedMessage,
      ...(input.memory.v3?.recentEdits ?? []).filter((e) => e !== resolvedMessage),
    ].slice(0, 8),
    reasoningProfile: profile,
  };

  return {
    handled: true,
    memoryPatch: {
      v3: v3Memory,
      selectedAssetId: asset?.assetId ?? input.memory.selectedAssetId,
      conversationMemory: {
        ...(input.memory.conversationMemory ?? { lastEntities: [] }),
        lastCharacter: asset?.assetName ?? input.memory.conversationMemory?.lastCharacter,
        lastAssetId: asset?.assetId ?? input.memory.conversationMemory?.lastAssetId,
        lastIntent: "assistant_v3_copilot",
        guidanceTopic: asset?.assetType ?? "general",
      },
    },
    v3Response,
    producerResponse: v3ResponseToProducerResponse(v3Response),
  };
}

export function auditAssistantV3Response(
  v3: AssistantV3CopilotResponse,
  input: AssistantV3TurnInput
): AssistantV3QualityAudit {
  const notes: string[] = [];
  const contextAwareness = v3.openingLine.length > 20 ? 0.8 : 0.4;
  let assetAwareness = v3.assetContext ? 0.95 : 0.3;
  let partAwareness = v3.partContext ? 0.95 : input.editorContext?.selectedPartName ? 0.7 : 0.25;
  const hierarchyAwareness =
    (v3.partContext?.hierarchyPath.length ?? 0) > 1 || (input.editorContext?.visibleHierarchyLabels?.length ?? 0) > 0
      ? 0.9
      : 0.35;
  const projectAwareness = v3.projectInsight ? 0.9 : input.activeProject ? 0.5 : 0.2;
  const workflowAwareness = v3.projectInsight?.recommendedNextStep ? 0.88 : v3.reasoningProfile === "editor" ? 0.75 : 0.45;
  const actionRelevance = v3.actionGroups.length > 0 ? (v3.partContext ? 0.95 : 0.85) : 0.35;
  const languageQuality = /help with that|select a workflow|what direction/i.test(v3.openingLine) ? 0.2 : 0.85;
  const routingAccuracy = v3.actionGroups.some((g) => g.actions.some((a) => a.route || a.actionId)) ? 0.85 : 0.5;

  if (languageQuality < 0.5) {
    notes.push("Generic robotic phrasing detected");
  }
  if (!v3.assetContext && input.studio.route.module === "editor") {
    notes.push("Editor route without asset context");
    assetAwareness = 0.4;
  }
  if (!v3.partContext && input.editorContext?.selectedPartName) {
    notes.push("Editor part selected but part context missing in response");
    partAwareness = 0.45;
  }

  const overall =
    (contextAwareness +
      assetAwareness +
      partAwareness +
      hierarchyAwareness +
      projectAwareness +
      workflowAwareness +
      actionRelevance +
      languageQuality +
      routingAccuracy) /
    9;

  return {
    contextAwareness,
    assetAwareness,
    partAwareness,
    hierarchyAwareness,
    projectAwareness,
    workflowAwareness,
    actionRelevance,
    languageQuality,
    routingAccuracy,
    overall,
    notes,
  };
}
