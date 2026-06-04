import { classifyOpenAiApiFailure, OcrProviderError } from "@/lib/ocr-provider-errors";
import {
  noteOpenAiRateLimitFailure,
  runOpenAiGated,
} from "@/server/openai/openai-request-gate";
import type {
  StudioVisionAnalyzeInput,
  StudioVisionBrandingSignal,
  StudioVisionCharacterSignal,
  StudioVisionLocationSignal,
  StudioVisionPropSignal,
  StudioVisionProvider,
  StudioVisionRawAnalysis,
  StudioVisionWorldSignal,
} from "@/server/studio-vision-providers/types";

type OpenAiVisionJson = {
  detectedElements?: string[];
  summary?: string;
  referenceComparisonUsed?: boolean;
  characters?: Array<{
    characterId?: string;
    name?: string;
    present?: boolean;
    clothingVisible?: boolean;
    accessoriesVisible?: boolean;
    mascotProportionsOk?: boolean;
    detectedTraits?: string[];
    missingTraits?: string[];
    notes?: string;
  }>;
  location?: {
    environmentElements?: string[];
    visualIdentityMatch?: boolean;
    worldCharacteristicsMatch?: boolean;
    missingElements?: string[];
    notes?: string;
  };
  props?: Array<{
    propId?: string;
    name?: string;
    visible?: boolean;
    brandingVisible?: boolean;
    detectedTraits?: string[];
    missingTraits?: string[];
    notes?: string;
  }>;
  branding?: {
    homecheffLogoVisible?: boolean;
    logoPlacementOk?: boolean;
    brandedPackagingVisible?: boolean;
    detectedElements?: string[];
    missingElements?: string[];
    notes?: string;
  };
  world?: {
    styleMatch?: boolean;
    toneMatch?: boolean;
    colorLanguageMatch?: boolean;
    detectedElements?: string[];
    missingElements?: string[];
    notes?: string;
  };
};

function buildMemoryContext(input: StudioVisionAnalyzeInput): string {
  const lines: string[] = [
    `Scene: ${input.sceneTitle}`,
    input.sceneDescription ? `Description: ${input.sceneDescription}` : "",
    input.sceneAction ? `Action: ${input.sceneAction}` : "",
    `Prompt used for generation: ${input.generatedPrompt}`,
    "",
    "Expected characters:",
  ];
  for (const c of input.memory.characters) {
    lines.push(
      `- ${c.name} (id: ${c.id}): appearance=${c.appearanceMemory}; clothing=${c.defaultClothing}; accessories=${c.defaultAccessories}; keywords=${c.visualKeywords}; role=${c.role}`
    );
    const ref = input.references.characters.find((r) => r.id === c.id);
    if (ref?.referenceImageUrl) {
      lines.push(`  Reference image available for comparison.`);
    }
  }
  if (input.memory.location) {
    const loc = input.memory.location;
    lines.push(
      `Expected location: ${loc.name} — ${loc.visualIdentity}; ${loc.environmentKeywords}; ${loc.worldMemory}`
    );
  }
  for (const p of input.memory.props) {
    lines.push(`Expected prop: ${p.name} — ${p.appearanceMemory}; branding=${p.brandingRules}`);
  }
  if (input.memory.world) {
    const w = input.memory.world;
    lines.push(`World: ${w.name} — style=${w.visualStyle}; tone=${w.tone}; rules=${w.continuityRules}`);
  }
  return lines.filter(Boolean).join("\n");
}

function normalizeCharacters(
  parsed: OpenAiVisionJson,
  input: StudioVisionAnalyzeInput
): StudioVisionCharacterSignal[] {
  const byId = new Map(
    (parsed.characters ?? []).map((c) => [c.characterId ?? c.name ?? "", c])
  );
  return input.memory.characters.map((mem) => {
    const row = byId.get(mem.id) ?? byId.get(mem.name);
    return {
      characterId: mem.id,
      name: mem.name,
      present: row?.present !== false,
      clothingVisible: row?.clothingVisible !== false,
      accessoriesVisible: row?.accessoriesVisible !== false,
      mascotProportionsOk: row?.mascotProportionsOk !== false,
      detectedTraits: Array.isArray(row?.detectedTraits) ? row.detectedTraits.map(String) : [],
      missingTraits: Array.isArray(row?.missingTraits) ? row.missingTraits.map(String) : [],
      notes: typeof row?.notes === "string" ? row.notes : "",
    };
  });
}

function normalizeLocation(
  parsed: OpenAiVisionJson,
  hasLocation: boolean
): StudioVisionLocationSignal | null {
  if (!hasLocation) {
    return null;
  }
  const loc = parsed.location ?? {};
  return {
    environmentElements: Array.isArray(loc.environmentElements)
      ? loc.environmentElements.map(String)
      : [],
    visualIdentityMatch: loc.visualIdentityMatch !== false,
    worldCharacteristicsMatch: loc.worldCharacteristicsMatch !== false,
    missingElements: Array.isArray(loc.missingElements) ? loc.missingElements.map(String) : [],
    notes: typeof loc.notes === "string" ? loc.notes : "",
  };
}

function normalizeProps(
  parsed: OpenAiVisionJson,
  input: StudioVisionAnalyzeInput
): StudioVisionPropSignal[] {
  const byId = new Map((parsed.props ?? []).map((p) => [p.propId ?? p.name ?? "", p]));
  return input.memory.props.map((mem) => {
    const row = byId.get(mem.id) ?? byId.get(mem.name);
    return {
      propId: mem.id,
      name: mem.name,
      visible: row?.visible !== false,
      brandingVisible: row?.brandingVisible !== false,
      detectedTraits: Array.isArray(row?.detectedTraits) ? row.detectedTraits.map(String) : [],
      missingTraits: Array.isArray(row?.missingTraits) ? row.missingTraits.map(String) : [],
      notes: typeof row?.notes === "string" ? row.notes : "",
    };
  });
}

function normalizeBranding(parsed: OpenAiVisionJson): StudioVisionBrandingSignal {
  const b = parsed.branding ?? {};
  return {
    homecheffLogoVisible: b.homecheffLogoVisible === true,
    logoPlacementOk: b.logoPlacementOk !== false,
    brandedPackagingVisible: b.brandedPackagingVisible === true,
    detectedElements: Array.isArray(b.detectedElements) ? b.detectedElements.map(String) : [],
    missingElements: Array.isArray(b.missingElements) ? b.missingElements.map(String) : [],
    notes: typeof b.notes === "string" ? b.notes : "",
  };
}

function normalizeWorld(
  parsed: OpenAiVisionJson,
  hasWorld: boolean
): StudioVisionWorldSignal | null {
  if (!hasWorld) {
    return null;
  }
  const w = parsed.world ?? {};
  return {
    styleMatch: w.styleMatch !== false,
    toneMatch: w.toneMatch !== false,
    colorLanguageMatch: w.colorLanguageMatch !== false,
    detectedElements: Array.isArray(w.detectedElements) ? w.detectedElements.map(String) : [],
    missingElements: Array.isArray(w.missingElements) ? w.missingElements.map(String) : [],
    notes: typeof w.notes === "string" ? w.notes : "",
  };
}

async function analyzeWithOpenAiInner(
  input: StudioVisionAnalyzeInput,
  apiKey: string
): Promise<StudioVisionRawAnalysis> {
  const model =
    process.env.STUDIO_VISION_MODEL?.trim() ||
    process.env.OPENAI_VISION_MODEL?.trim() ||
    process.env.OPENAI_PREFLIGHT_MODEL?.trim() ||
    "gpt-4o-mini";

  const imageUrl = input.thumbnailUrl?.trim() || input.sceneImageUrl;
  const refUrls = [
    ...input.references.characters.map((c) => c.referenceImageUrl).filter(Boolean),
    input.references.location?.referenceImageUrl,
    ...input.references.props.map((p) => p.referenceImageUrl).filter(Boolean),
  ].filter((u): u is string => Boolean(u?.trim()));

  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    {
      type: "text",
      text: `Inspect this generated scene image for HomeCheff Studio visual continuity.\n\n${buildMemoryContext(input)}\n\nCompare the generated image to expected memory. When reference images were provided, factor identity similarity. Return JSON only.`,
    },
    { type: "image_url", image_url: { url: imageUrl } },
  ];

  for (const ref of refUrls.slice(0, 4)) {
    userContent.push({
      type: "text",
      text: "Reference image for identity comparison:",
    });
    userContent.push({ type: "image_url", image_url: { url: ref } });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a visual QA inspector for branded storyboard stills. Return JSON only:
{
  "detectedElements": string[],
  "summary": string,
  "referenceComparisonUsed": boolean,
  "characters": [{ "characterId", "name", "present", "clothingVisible", "accessoriesVisible", "mascotProportionsOk", "detectedTraits", "missingTraits", "notes" }],
  "location": { "environmentElements", "visualIdentityMatch", "worldCharacteristicsMatch", "missingElements", "notes" },
  "props": [{ "propId", "name", "visible", "brandingVisible", "detectedTraits", "missingTraits", "notes" }],
  "branding": { "homecheffLogoVisible", "logoPlacementOk", "brandedPackagingVisible", "detectedElements", "missingElements", "notes" },
  "world": { "styleMatch", "toneMatch", "colorLanguageMatch", "detectedElements", "missingElements", "notes" }
}
Be conservative: if an expected chef hat, apron, logo, or prop is not clearly visible, mark missing traits and set booleans false.`,
        },
        { role: "user", content: userContent },
      ],
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!res.ok) {
    const msg = body.error?.message ?? `OpenAI studio vision failed (${res.status}).`;
    const code = classifyOpenAiApiFailure(res.status, msg);
    const err = new OcrProviderError(code, msg, "openai_studio_vision");
    noteOpenAiRateLimitFailure(err);
    throw err;
  }

  let parsed: OpenAiVisionJson = {};
  try {
    parsed = JSON.parse(body.choices?.[0]?.message?.content ?? "{}") as OpenAiVisionJson;
  } catch {
    throw new Error("OpenAI studio vision returned invalid JSON.");
  }

  const referenceComparisonUsed =
    parsed.referenceComparisonUsed === true || refUrls.length > 0;

  return {
    providerId: "openai",
    analysisMethod: "openai_vision",
    referenceComparisonUsed,
    detectedElements: Array.isArray(parsed.detectedElements)
      ? parsed.detectedElements.map(String)
      : [],
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
    characters: normalizeCharacters(parsed, input),
    location: normalizeLocation(parsed, Boolean(input.memory.location)),
    props: normalizeProps(parsed, input),
    branding: normalizeBranding(parsed),
    world: normalizeWorld(parsed, Boolean(input.memory.world)),
  };
}

export class OpenAiStudioVisionProvider implements StudioVisionProvider {
  readonly id = "openai";

  analyzeImage(input: StudioVisionAnalyzeInput): Promise<StudioVisionRawAnalysis> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }
    return runOpenAiGated(() => analyzeWithOpenAiInner(input, apiKey));
  }
}
