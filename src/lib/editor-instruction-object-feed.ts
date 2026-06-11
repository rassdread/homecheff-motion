import { actionsForInstructionCategory } from "@/lib/editor-instruction-actions";
import { resolveHumanFirstObjectType } from "@/lib/editor-ux-cleanup";
import type {
  EditorInstructionObjectCategory,
  EditorInstructionObjectFeedMeta,
  EditorInstructionObjectSource,
  EditorInstructionObjectV2,
} from "@/types/editor-instruction-studio";
import type {
  EditorCanvasDocument,
  EditorCanvasLayer,
  EditorObject,
  EditorSemanticLayer,
} from "@/types/homecheff-visual-editor";
import type { EditorAssetProfile } from "@/types/editor-asset-profile";

export type InstructionObjectFeedResult = {
  objects: EditorInstructionObjectV2[];
  meta: EditorInstructionObjectFeedMeta;
};

function slugifyId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function inferCategoryFromText(
  label: string,
  hints: string[] = []
): EditorInstructionObjectCategory {
  const text = `${label} ${hints.join(" ")}`.toLowerCase();

  if (/background|backdrop|scene bg/.test(text)) {
    return "background";
  }
  if (/logo|brand mark|brand element/.test(text)) {
    return "logo";
  }
  if (/\btext\b|caption|title|typography|tekst/.test(text)) {
    return "text";
  }
  if (/mascot|character|chef|person|man|woman|figure|globe man|globeman/.test(text)) {
    return "character";
  }
  if (/apron|shirt|jacket|hat|clothing|uniform|outfit|tie|shoe|suit|footwear|pants|trousers/.test(text)) {
    return "clothing";
  }
  if (/packaging|box|carton|wrapper|label/.test(text)) {
    return "packaging";
  }
  if (/cup|mug|bottle|product|item/.test(text)) {
    return "product";
  }
  if (/food|dish|meal|plate|pan|pot/.test(text)) {
    return "food";
  }
  if (/\bglobe\b|tool|utensil|knife|spoon/.test(text) && !/globe man|globeman/.test(text)) {
    return "tool";
  }
  if (/truck|van|vehicle|car/.test(text)) {
    return "vehicle";
  }
  if (/building|storefront|shop|facade/.test(text)) {
    return "building";
  }
  if (/sign|banner|billboard|poster/.test(text)) {
    return "signage";
  }
  if (/sky|scene|environment|landscape|garden|outdoor/.test(text)) {
    return "environment";
  }
  return "other";
}

function inferCategoryFromLayer(layer: EditorCanvasLayer, label: string): EditorInstructionObjectCategory {
  const humanType = resolveHumanFirstObjectType(layer);
  if (layer.layerType === "background" || humanType === "background") {
    return "background";
  }
  return inferCategoryFromText(label, [
    layer.category ?? "",
    layer.semanticType ?? "",
    humanType ?? "",
  ]);
}

function inferCategoryFromEditorObject(obj: EditorObject): EditorInstructionObjectCategory {
  if (obj.category === "background") {
    return "background";
  }
  return inferCategoryFromText(obj.label, [obj.category, obj.partCategory ?? ""]);
}

function inferCategoryFromSemanticLayer(layer: EditorSemanticLayer): EditorInstructionObjectCategory {
  if (layer.type === "background" || layer.category === "background") {
    return "background";
  }
  return inferCategoryFromText(layer.label, [layer.type, layer.category]);
}

function describeObject(label: string, category: EditorInstructionObjectCategory): string {
  const normalized = label.trim() || category;
  switch (category) {
    case "clothing":
      return `${normalized} clothing item`;
    case "packaging":
      return `${normalized} packaging`;
    case "character":
      return `${normalized} character or mascot`;
    case "logo":
      return `${normalized} logo or brand mark`;
    case "background":
      return "Scene background";
    case "tool":
      return `${normalized} object or prop`;
    default:
      return normalized;
  }
}

function buildInstructionObject(
  input: {
    label: string;
    category: EditorInstructionObjectCategory;
    confidence: number;
    source: EditorInstructionObjectSource;
    layerId?: string;
    index: number;
  }
): EditorInstructionObjectV2 {
  const label = input.label.trim() || `Object ${input.index + 1}`;
  const slug = slugifyId(label) || input.category;
  return {
    id: `obj_${slug}_${input.index}`,
    label,
    category: input.category,
    confidence: input.confidence,
    description: describeObject(label, input.category),
    suggestedActions: actionsForInstructionCategory(input.category),
    layerId: input.layerId,
    source: input.source,
  };
}

function dedupeObjects(objects: EditorInstructionObjectV2[]): EditorInstructionObjectV2[] {
  const seen = new Set<string>();
  const results: EditorInstructionObjectV2[] = [];
  for (const obj of objects) {
    const key = `${obj.category}:${obj.label.toLowerCase()}`;
    if (seen.has(key) && obj.category !== "background") {
      continue;
    }
    seen.add(key);
    results.push(obj);
  }
  return results;
}

function ensureBackground(objects: EditorInstructionObjectV2[], source: EditorInstructionObjectSource): EditorInstructionObjectV2[] {
  if (objects.some((o) => o.category === "background")) {
    return objects;
  }
  return [
    ...objects,
    buildInstructionObject({
      label: "Background",
      category: "background",
      confidence: 1,
      source,
      layerId: "background",
      index: objects.length,
    }),
  ];
}

export function isGlobeManMascotImage(document: EditorCanvasDocument): boolean {
  const text = [
    document.name,
    document.assetProfile?.variantGroup?.baseLabel,
    document.assetProfile?.variantGroup?.groupId,
    document.sourceKind,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    /globe\s*man|globe-man|globeman|homecheff.*mascot|mascot.*globe/.test(text) ||
    (document.assetProfile?.variantGroup?.groupId === "globe_man") ||
    (document.assetProfile?.assetType === "mascot" && /globe|homecheff|mascot|chef/.test(text))
  );
}

export function buildGlobeManHeuristicObjects(): EditorInstructionObjectV2[] {
  const specs: Array<{ label: string; category: EditorInstructionObjectCategory; confidence: number }> = [
    { label: "Character / Globe Man", category: "character", confidence: 0.58 },
    { label: "Globe", category: "tool", confidence: 0.55 },
    { label: "Clothing / suit", category: "clothing", confidence: 0.55 },
    { label: "Tie", category: "clothing", confidence: 0.52 },
    { label: "Shoes", category: "clothing", confidence: 0.52 },
    { label: "Background", category: "background", confidence: 1 },
  ];
  return specs.map((spec, index) =>
    buildInstructionObject({
      ...spec,
      source: "heuristic",
      layerId: spec.category === "background" ? "background" : undefined,
      index,
    })
  );
}

function documentHasLikelyForegroundSubject(document: EditorCanvasDocument): boolean {
  if (document.name && !/^background|bg\.|wallpaper|blank/i.test(document.name)) {
    return true;
  }
  if (document.assetProfile && document.assetProfile.assetType !== "background") {
    return true;
  }
  if (document.sourceKind === "character" || document.sourceKind === "logo" || document.sourceKind === "product_photo") {
    return true;
  }
  if ((document.detectionMeta?.count ?? 0) > 0) {
    return true;
  }
  if (document.semanticLayers?.some((layer) => layer.type !== "background")) {
    return true;
  }
  if (document.detectedObjects?.some((obj) => obj.category !== "background")) {
    return true;
  }
  return false;
}

function mapCanvasLayers(document: EditorCanvasDocument): EditorInstructionObjectV2[] {
  return document.objects.map((layer, index) =>
    buildInstructionObject({
      label: layer.label?.trim() || `Object ${index + 1}`,
      category: inferCategoryFromLayer(layer, layer.label ?? ""),
      confidence: layer.confidence ?? 0.72,
      source: "objects",
      layerId: layer.id,
      index,
    })
  );
}

function mapDetectedObjects(document: EditorCanvasDocument): EditorInstructionObjectV2[] {
  return (document.detectedObjects ?? []).map((obj, index) =>
    buildInstructionObject({
      label: obj.label?.trim() || `Object ${index + 1}`,
      category: inferCategoryFromEditorObject(obj),
      confidence: obj.confidence ?? 0.7,
      source: "detectedObjects",
      layerId: obj.layerId,
      index,
    })
  );
}

function mapSemanticLayers(document: EditorCanvasDocument): EditorInstructionObjectV2[] {
  return (document.semanticLayers ?? []).map((layer, index) =>
    buildInstructionObject({
      label: layer.label?.trim() || `Object ${index + 1}`,
      category: inferCategoryFromSemanticLayer(layer),
      confidence: layer.confidence ?? 0.68,
      source: "semanticLayers",
      layerId: layer.id,
      index,
    })
  );
}

function buildFromAssetProfile(
  profile: EditorAssetProfile | undefined,
  document: EditorCanvasDocument
): EditorInstructionObjectV2[] {
  if (!profile) {
    return [];
  }
  if (profile.variantGroup?.groupId === "globe_man" || isGlobeManMascotImage(document)) {
    return buildGlobeManHeuristicObjects();
  }
  if (profile.assetType === "logo") {
    return dedupeObjects(
      ensureBackground(
        [
          buildInstructionObject({
            label: "Logo",
            category: "logo",
            confidence: profile.confidence,
            source: "assetProfile",
            index: 0,
          }),
        ],
        "assetProfile"
      )
    );
  }
  if (profile.assetType === "mascot" || profile.assetType === "character") {
    return dedupeObjects(
      ensureBackground(
        [
          buildInstructionObject({
            label: profile.variantGroup?.baseLabel ?? document.name ?? "Character",
            category: "character",
            confidence: profile.confidence,
            source: "assetProfile",
            index: 0,
          }),
        ],
        "assetProfile"
      )
    );
  }
  return [];
}

function nonBackgroundCount(objects: EditorInstructionObjectV2[]): number {
  return objects.filter((o) => o.category !== "background").length;
}

function resolvePrimarySource(sourcesUsed: EditorInstructionObjectSource[]): EditorInstructionObjectSource | "mixed" {
  if (sourcesUsed.length === 0) {
    return "fallback";
  }
  if (sourcesUsed.length === 1) {
    return sourcesUsed[0]!;
  }
  return "mixed";
}

/**
 * Builds instruction-studio object intelligence from all available document signals.
 * Priority: explicit instructionObjects → assetProfile → detectedObjects → objects →
 * semanticLayers → mascot heuristics → foreground fallback → background only.
 */
export function buildInstructionObjectsFromDocument(
  document: EditorCanvasDocument
): InstructionObjectFeedResult {
  const explicit = document.instructionStudioState?.instructionObjects;
  if (explicit?.length) {
    const objects = ensureBackground(dedupeObjects(explicit), "instructionObjects");
    return {
      objects,
      meta: {
        source: "instructionObjects",
        count: objects.length,
        lowConfidence: false,
        sourcesUsed: ["instructionObjects"],
      },
    };
  }

  const sourcesUsed: EditorInstructionObjectSource[] = [];
  const candidates: EditorInstructionObjectV2[] = [];

  const fromProfile = buildFromAssetProfile(document.assetProfile, document);
  if (fromProfile.length > 0) {
    candidates.push(...fromProfile);
    sourcesUsed.push("assetProfile");
  }

  const fromDetected = mapDetectedObjects(document);
  if (fromDetected.length > 0) {
    candidates.push(...fromDetected);
    sourcesUsed.push("detectedObjects");
  }

  const fromLayers = mapCanvasLayers(document);
  if (fromLayers.length > 0) {
    candidates.push(...fromLayers);
    sourcesUsed.push("objects");
  }

  const fromSemantic = mapSemanticLayers(document);
  if (fromSemantic.length > 0) {
    candidates.push(...fromSemantic);
    sourcesUsed.push("semanticLayers");
  }

  let objects = dedupeObjects(candidates);
  let lowConfidence = false;

  if (nonBackgroundCount(objects) === 0 && isGlobeManMascotImage(document)) {
    objects = buildGlobeManHeuristicObjects();
    sourcesUsed.length = 0;
    sourcesUsed.push("heuristic");
    lowConfidence = true;
  }

  if (nonBackgroundCount(objects) === 0 && documentHasLikelyForegroundSubject(document)) {
    objects = ensureBackground(
      [
        buildInstructionObject({
          label: "Main subject",
          category: "other",
          confidence: 0.48,
          source: "fallback",
          index: 0,
        }),
      ],
      "fallback"
    );
    sourcesUsed.length = 0;
    sourcesUsed.push("fallback");
    lowConfidence = true;
  }

  if (objects.length === 0) {
    objects = ensureBackground([], "fallback");
    sourcesUsed.push("fallback");
  } else {
    objects = ensureBackground(objects, sourcesUsed[sourcesUsed.length - 1] ?? "fallback");
  }

  const onlyBackground =
    objects.length === 1 && objects[0]?.category === "background" && documentHasLikelyForegroundSubject(document);
  if (onlyBackground) {
    objects = ensureBackground(
      [
        buildInstructionObject({
          label: "Main subject",
          category: "other",
          confidence: 0.48,
          source: "fallback",
          index: 0,
        }),
        ...objects,
      ],
      "fallback"
    );
    sourcesUsed.push("fallback");
    lowConfidence = true;
  }

  if (objects.some((o) => o.source === "heuristic" || (o.confidence ?? 1) < 0.6)) {
    lowConfidence = lowConfidence || objects.some((o) => o.confidence < 0.6);
  }

  return {
    objects,
    meta: {
      source: resolvePrimarySource(sourcesUsed),
      count: objects.length,
      lowConfidence,
      sourcesUsed: [...new Set(sourcesUsed)],
    },
  };
}
