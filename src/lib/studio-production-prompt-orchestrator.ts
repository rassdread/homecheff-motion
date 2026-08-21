/**
 * S2A — Canonical production prompt facade.
 * Reuses Prompt Builder v4 section text; assembles with documented precedence.
 * Does not replace provider adapters.
 */

import { VIDU_PROMPT_MAX_CHARS, applyViduPromptBudget } from "@/lib/vidu-prompt-budget";
import { resolveSceneStillCapability, resolveViduModeCapability } from "@/lib/studio-generation-provider-capabilities";
import { getUpcScene } from "@/lib/studio-unified-production-context";
import type { PromptBuilderOutput } from "@/types/studio-prompt-builder";
import type {
  ProductionInstructions,
  ProductionPromptSection,
  ProductionPromptTarget,
  ProductionReferenceAccounting,
  ProductionReferenceAsset,
  UnifiedProductionContext,
  UpcScene,
} from "@/types/studio-unified-production-context";
import {
  PROMPT_ORCHESTRATOR_VERSION,
  SCENE_EXECUTION_VERSION,
} from "@/types/studio-unified-production-context";

/**
 * Precedence (highest first):
 * 1 safety/provider constraints
 * 2 explicit user scene override (title/description/action/emotion)
 * 3 identity / product hard constraints
 * 4 continuity
 * 5 camera
 * 6 location
 * 7 style/world
 * 8 generic polish
 */
const SECTION_PRIORITY: Record<ProductionPromptSection["id"], number> = {
  safety: 1,
  user_override: 2,
  identity: 3,
  product: 3,
  continuity: 4,
  action: 5,
  camera: 5,
  location: 6,
  style: 7,
  polish: 8,
};

const SAFETY_STILL =
  "Single cinematic still frame. No text overlays. No watermarks. No collage.";
const SAFETY_MOTION =
  "Keep identity, wardrobe, and branded objects stable across motion. Do not morph faces, logos, or product labels.";

export type BuildProductionInstructionsInput = {
  upc: UnifiedProductionContext;
  sceneId: string;
  target: ProductionPromptTarget;
  builderOutput: PromptBuilderOutput;
  identityDriftLines?: string[];
};

function join(...parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join("\n");
}

function sceneEntities(upc: UnifiedProductionContext, scene: UpcScene) {
  return {
    characters: upc.characters.filter((c) => scene.characterIds.includes(c.id)),
    location: upc.locations.find((l) => l.id === scene.locationId) ?? null,
    props: upc.props.filter((p) => scene.propIds.includes(p.id)),
  };
}

function sceneReferences(upc: UnifiedProductionContext, scene: UpcScene): ProductionReferenceAsset[] {
  return upc.references.filter((ref) => {
    if (ref.entityKind === "character") {
      return scene.characterIds.includes(ref.entityId);
    }
    if (ref.entityKind === "location") {
      return scene.locationId === ref.entityId;
    }
    return scene.propIds.includes(ref.entityId);
  });
}

function accountReferences(params: {
  target: ProductionPromptTarget;
  refs: ProductionReferenceAsset[];
}): ProductionInstructions["referenceAccounting"] {
  const still = resolveSceneStillCapability();
  const vidu = resolveViduModeCapability(params.target === "motion" ? "multiframe" : "start_end");
  return params.refs.map((ref) => {
    if (!ref.url) {
      return {
        entityId: ref.entityId,
        entityKind: ref.entityKind,
        accounting: "missing" as ProductionReferenceAccounting,
        reason: "No reference URL on entity.",
      };
    }
    if (params.target === "scene-image" || params.target === "rerender") {
      if (still.useReferenceEdit && still.editsClass !== "UNSUPPORTED_FOR_REFERENCES") {
        return {
          entityId: ref.entityId,
          entityKind: ref.entityKind,
          accounting: "used" as const,
          reason: `OpenAI image edits (${still.editsClass}) with ${still.editModel}.`,
        };
      }
      return {
        entityId: ref.entityId,
        entityKind: ref.entityKind,
        accounting: "text_fallback" as const,
        reason: `Active still path is ${still.generationsClass}; pixel conditioning not used.`,
      };
    }
    return {
      entityId: ref.entityId,
      entityKind: ref.entityKind,
      accounting: "unsupported" as const,
      reason: `Vidu ${vidu.mode} uses keyframes + prompt (${vidu.identityVia}); entity reference images are not a native field.`,
    };
  });
}

function identityText(
  upc: UnifiedProductionContext,
  scene: UpcScene,
  builder: PromptBuilderOutput
): string {
  const { characters } = sceneEntities(upc, scene);
  const extra = characters
    .map((character) => {
      const bits = [
        character.textIdentity.defaultClothing
          ? `${character.name} clothing: ${character.textIdentity.defaultClothing}.`
          : "",
        character.textIdentity.forbidden
          ? `${character.name} forbidden: ${character.textIdentity.forbidden}.`
          : "",
        character.referenceIdentity.primaryUrl
          ? `${character.name}: match the primary identity reference.`
          : "",
      ];
      return join(...bits);
    })
    .filter(Boolean);
  return join(builder.sections.identity, builder.sections.directorIdentity, builder.sections.characters, ...extra);
}

function productText(upc: UnifiedProductionContext, scene: UpcScene, builder: PromptBuilderOutput): string {
  const { props } = sceneEntities(upc, scene);
  const hard = props
    .filter((prop) => prop.exactness === "MUST_PRESERVE")
    .map((prop) =>
      prop.pixelPreservedStill
        ? `MUST_PRESERVE ${prop.name}: use the pixel-preserved product/logo still. Do not redraw branding.`
        : `MUST_PRESERVE ${prop.name}: keep branding, logo geometry, and label text unchanged.`
    );
  return join(builder.sections.props, ...hard);
}

function continuityText(
  scene: UpcScene,
  builder: PromptBuilderOutput,
  identityDriftLines?: string[]
): string {
  return join(
    ...scene.continuity.enteringNotes,
    builder.sections.continuity,
    ...(identityDriftLines ?? [])
  );
}

function buildSections(params: BuildProductionInstructionsInput, scene: UpcScene): ProductionPromptSection[] {
  const { upc, builderOutput, target, identityDriftLines } = params;
  const safety = target === "motion" ? SAFETY_MOTION : SAFETY_STILL;
  const userOverride = join(
    builderOutput.sections.sceneContext,
    scene.action && !builderOutput.sections.action ? `Action: ${scene.action}` : "",
    scene.emotion && !builderOutput.sections.emotion ? `Emotion: ${scene.emotion}` : ""
  );
  const raw: ProductionPromptSection[] = [
    { id: "safety", priority: SECTION_PRIORITY.safety, text: safety },
    { id: "user_override", priority: SECTION_PRIORITY.user_override, text: userOverride },
    { id: "identity", priority: SECTION_PRIORITY.identity, text: identityText(upc, scene, builderOutput) },
    { id: "product", priority: SECTION_PRIORITY.product, text: productText(upc, scene, builderOutput) },
    {
      id: "continuity",
      priority: SECTION_PRIORITY.continuity,
      text: continuityText(scene, builderOutput, identityDriftLines),
    },
    {
      id: "action",
      priority: SECTION_PRIORITY.action,
      text: join(builderOutput.sections.action, builderOutput.sections.emotion),
    },
    {
      id: "camera",
      priority: SECTION_PRIORITY.camera,
      text: join(builderOutput.sections.camera, builderOutput.sections.director),
    },
    { id: "location", priority: SECTION_PRIORITY.location, text: builderOutput.sections.location },
    {
      id: "style",
      priority: SECTION_PRIORITY.style,
      text: upc.style.resolvedSummary,
    },
    { id: "polish", priority: SECTION_PRIORITY.polish, text: builderOutput.sections.qualityInstructions },
  ];
  return raw.filter((section) => section.text.trim());
}

function assembleInPriority(sections: ProductionPromptSection[]): string {
  return [...sections]
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
    .map((section) => section.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function budgetMotionPrompt(sections: ProductionPromptSection[]): string {
  const blocks = [...sections]
    .sort((a, b) => a.priority - b.priority)
    .map((section) => ({
      id: section.id,
      priority: (section.priority <= 3 ? 1 : section.priority <= 5 ? 2 : 3) as 1 | 2 | 3,
      text: section.text,
    }));
  return applyViduPromptBudget({
    blocks,
    maxChars: VIDU_PROMPT_MAX_CHARS,
  }).prompt;
}

export function mergeProductionNegatives(params: {
  safety?: string[];
  identity?: string[];
  brand?: string[];
  preset?: string[];
  motion?: string[];
}): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const line of [
    ...(params.safety ?? []),
    ...(params.identity ?? []),
    ...(params.brand ?? []),
    ...(params.preset ?? []),
    ...(params.motion ?? []),
  ]) {
    const normalized = line.replace(/\s+/g, " ").trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(normalized);
  }
  return merged;
}

export function buildProductionInstructions(
  input: BuildProductionInstructionsInput
): ProductionInstructions {
  const scene = getUpcScene(input.upc, input.sceneId);
  if (!scene) {
    throw new Error(`UPC has no scene ${input.sceneId}.`);
  }
  const sections = buildSections(input, scene);
  const assembledPrompt =
    input.target === "motion" ? budgetMotionPrompt(sections) : assembleInPriority(sections);
  const refs = sceneReferences(input.upc, scene);
  const still = resolveSceneStillCapability();
  const providerMode =
    input.target === "motion"
      ? "vidu_motion"
      : still.useReferenceEdit && refs.some((ref) => ref.url)
        ? `openai_image_edits:${still.editModel}`
        : `openai_image_generations:${still.primaryModel}`;

  const identityNegatives = sceneEntities(input.upc, scene)
    .characters.map((c) => c.textIdentity.forbidden)
    .filter(Boolean)
    .map((forbidden) => `Do not show: ${forbidden}`);
  const brandNegatives = sceneEntities(input.upc, scene)
    .props.filter((p) => p.exactness === "MUST_PRESERVE")
    .map((p) => `Do not redraw, morph, or replace ${p.name} branding.`);

  return {
    orchestratorVersion: PROMPT_ORCHESTRATOR_VERSION,
    executionVersion: SCENE_EXECUTION_VERSION,
    target: input.target,
    upcHash: input.upc.upcHash,
    sceneId: scene.sceneId,
    sceneContextHash: scene.sceneContextHash,
    sections,
    assembledPrompt,
    negatives: mergeProductionNegatives({
      safety: ["no text overlays", "no watermarks"],
      identity: identityNegatives,
      brand: brandNegatives,
    }),
    references: refs,
    referenceAccounting: accountReferences({ target: input.target, refs }),
    providerMode,
  };
}

export function pickReferenceUrlsForStillAdapter(
  instructions: ProductionInstructions,
  max = 4
): Array<{ url: string; entityId: string; role: string; exactness: ProductionReferenceAsset["exactness"] }> {
  const ranked = [...instructions.references]
    .filter((ref) => ref.url)
    .sort((a, b) => {
      const rank = (exactness: ProductionReferenceAsset["exactness"]) =>
        exactness === "MUST_PRESERVE" ? 0 : exactness === "SHOULD_MATCH" ? 1 : 2;
      const kindRank = (kind: ProductionReferenceAsset["entityKind"]) =>
        kind === "logo" || kind === "product" ? 0 : kind === "character" ? 1 : kind === "location" ? 2 : 3;
      return rank(a.exactness) - rank(b.exactness) || kindRank(a.entityKind) - kindRank(b.entityKind);
    });
  const seen = new Set<string>();
  const picked: Array<{
    url: string;
    entityId: string;
    role: string;
    exactness: ProductionReferenceAsset["exactness"];
  }> = [];
  for (const ref of ranked) {
    const url = ref.url!;
    if (seen.has(url) || picked.length >= max) {
      continue;
    }
    seen.add(url);
    picked.push({ url, entityId: ref.entityId, role: ref.role, exactness: ref.exactness });
  }
  return picked;
}
