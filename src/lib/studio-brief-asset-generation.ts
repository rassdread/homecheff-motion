import { generateStudioAssetReferenceApi } from "@/lib/studio-asset-reference-client";
import { createHcAssetReference, upsertHcAssetReference } from "@/lib/hc-asset-references";
import { readHcWorkflowV2, storeStudioWorkflowInHc, writeHcWorkflowV2 } from "@/lib/hc-workflow-v2";
import type {
  EnrichedCharacterConcept,
  EnrichedLocationConcept,
  EnrichedPropConcept,
  EnrichedWorldConcept,
} from "@/lib/studio-brief-asset-wizards";
import type { BriefWizardKind } from "@/components/studio/studio-brief-asset-wizard-panel";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

export type BriefWizardConcept =
  | EnrichedCharacterConcept
  | EnrichedLocationConcept
  | EnrichedPropConcept
  | EnrichedWorldConcept;

export type GeneratedBriefAsset = {
  id: string;
  kind: BriefWizardKind;
  name: string;
  thumbnailUrl: string;
  referenceImageUrl: string;
  referenceStorageKey: string;
  provider: string;
  generatedPrompt: string;
  estimatedCredits: number;
  createdAt: string;
  origin: "brief_wizard";
  workflowId?: string;
  projectId: string;
};

function apiKindForBrief(kind: BriefWizardKind): StudioAssetKind {
  return kind === "world" ? "location" : kind;
}

export function buildSummaryPromptForBriefAsset(
  kind: BriefWizardKind,
  concept: BriefWizardConcept
): { summaryPrompt: string; choices: Record<string, string> } {
  const choices: Record<string, string> = {};
  for (const [key, value] of Object.entries(concept)) {
    if (typeof value === "string" || typeof value === "number") {
      choices[key] = String(value);
    }
  }

  if (kind === "character") {
    const c = concept as EnrichedCharacterConcept;
    return {
      summaryPrompt: `Character portrait: ${c.name}. ${c.personality}. ${c.clothing}. Style: ${c.style}. Voice: ${c.voiceStyle}.`,
      choices,
    };
  }
  if (kind === "location") {
    const l = concept as EnrichedLocationConcept;
    return {
      summaryPrompt: `Location: ${l.name}. ${l.description}. Lighting: ${l.lighting}. Mood: ${l.mood}.`,
      choices,
    };
  }
  if (kind === "prop") {
    const p = concept as EnrichedPropConcept;
    return {
      summaryPrompt: `Prop: ${p.name}. ${p.description}. Placement: ${p.placement}. Style: ${p.style}.`,
      choices,
    };
  }
  const w = concept as EnrichedWorldConcept;
  return {
    summaryPrompt: `World environment: ${w.name}. ${w.atmosphere}. Palette: ${w.palette}. Style: ${w.style}.`,
    choices,
  };
}

export async function generateBriefAssetImage(input: {
  kind: BriefWizardKind;
  concept: BriefWizardConcept;
  projectId: string;
  workflowId?: string;
  sourceReference?: {
    name: string;
    imageUrl: string;
    userPrompt?: string;
  };
}): Promise<{ ok: true; asset: GeneratedBriefAsset } | { ok: false; error: string }> {
  const { summaryPrompt, choices } = buildSummaryPromptForBriefAsset(input.kind, input.concept);
  const generationId = `brief_${input.kind}_${input.projectId}_${Date.now()}`;
  const res = await generateStudioAssetReferenceApi({
    kind: apiKindForBrief(input.kind),
    summaryPrompt,
    choices,
    customTexts: { name: "name" in input.concept ? input.concept.name : input.kind },
    generationId,
    ...(input.sourceReference
      ? {
          sourceReference: {
            name: input.sourceReference.name,
            imageUrl: input.sourceReference.imageUrl,
            userPrompt: input.sourceReference.userPrompt,
          },
        }
      : {}),
  });

  if (!res.ok) {
    const payload = res.data as unknown as { error?: string };
    const message =
      typeof payload.error === "string"
        ? payload.error
        : res.networkError
          ? "Network error"
          : "Generation failed";
    return { ok: false, error: message };
  }

  const name = "name" in input.concept ? input.concept.name : input.kind;
  const credits = "estimatedCredits" in input.concept ? input.concept.estimatedCredits : 2;

  return {
    ok: true,
    asset: {
      id: generationId,
      kind: input.kind,
      name,
      thumbnailUrl: res.data.thumbnailUrl,
      referenceImageUrl: res.data.referenceImageUrl,
      referenceStorageKey: res.data.referenceStorageKey,
      provider: res.data.provider,
      generatedPrompt: res.data.generatedPrompt,
      estimatedCredits: credits,
      createdAt: new Date().toISOString(),
      origin: "brief_wizard",
      workflowId: input.workflowId,
      projectId: input.projectId,
    },
  };
}

export function persistGeneratedBriefAssetToHc(
  project: HomeCheffProjectPackage,
  asset: GeneratedBriefAsset
): HomeCheffProjectPackage {
  const ref = createHcAssetReference({
    id: asset.id,
    url: asset.referenceImageUrl,
    storageKey: asset.referenceStorageKey,
    kind: asset.kind,
    role: asset.name,
    sourceService: "studio",
    mimeType: "image/png",
  });

  const next = upsertHcAssetReference(project, ref);
  const root = readHcWorkflowV2(next);
  const generated = {
    ...(root.generatedBriefAssets as Record<string, GeneratedBriefAsset> | undefined),
    [asset.id]: asset,
  };

  return writeHcWorkflowV2(
    storeStudioWorkflowInHc(next, {
      phase: "generate",
      inventorySummary: {
        available: [...(root.studio?.inventorySummary?.available ?? []), asset.kind],
        missing: (root.studio?.inventorySummary?.missing ?? []).filter((m) => m !== asset.kind),
        optional: root.studio?.inventorySummary?.optional ?? [],
      },
    }),
    { generatedBriefAssets: generated }
  );
}
