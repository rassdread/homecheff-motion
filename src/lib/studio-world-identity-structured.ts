/** World Identity — structured encoding across visualStyle, tone, continuityRules. */

const STRUCTURED_PREFIX = "hc:";
export const WORLD_VISUAL_DETAILS_MARKER = "[identity:visual_details]";
export const WORLD_AUDIO_DETAILS_MARKER = "[identity:audio_details]";
export const WORLD_SHOTS_MARKER = "[identity:shots]";
export const WORLD_RENDER_MARKER = "[identity:render]";
export const WORLD_FORBIDDEN_MARKER = "[identity:forbidden]";
export const WORLD_AUDIO_FORBIDDEN_MARKER = "[identity:audio_forbidden]";
export const WORLD_BRAND_MARKER = "[identity:brand]";

export type StructuredWorldVisual = {
  worldType: string;
  visualStyle: string;
  shapeLanguage: string;
  colorTheme: string;
  lighting: string;
  mood: string;
  environmentFeel: string;
  freeTags: string[];
};

export type StructuredWorldAudio = {
  musicStyle: string;
  ambience: string;
  audioEnergy: string;
  voiceDirection: string;
  soundFeel: string;
  freeTags: string[];
};

export type StructuredWorldShots = {
  cameraStyle: string;
  motionStyle: string;
  pacing: string;
  preferredShots: string;
  forbiddenShotStyles: string;
  freeTags: string[];
};

function parseStructuredBlock(
  raw: string,
  keys: Record<string, keyof StructuredWorldVisual | keyof StructuredWorldAudio | keyof StructuredWorldShots>
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const part of raw.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean)) {
    if (!part.startsWith(STRUCTURED_PREFIX)) continue;
    const body = part.slice(STRUCTURED_PREFIX.length);
    const eq = body.indexOf("=");
    if (eq <= 0) continue;
    const key = body.slice(0, eq);
    const value = body.slice(eq + 1);
    const field = keys[key];
    if (!field) continue;
    if (field === "preferredShots") {
      out[field] = value.replace(/\|/g, ", ");
    } else if (typeof out[field] === "undefined") {
      out[field] = value.replace(/\|/g, ", ");
    }
  }
  return out;
}

function encodeStructuredBlock(
  entries: Array<[string, string | undefined]>
): string {
  return entries
    .filter(([, value]) => Boolean(value?.trim()))
    .map(([key, value]) => `${STRUCTURED_PREFIX}${key}=${String(value).replace(/,\s*/g, "|")}`)
    .join(", ");
}

export function parseWorldVisualStructured(raw: string): StructuredWorldVisual {
  const structuredPart = raw.split(WORLD_VISUAL_DETAILS_MARKER)[0] ?? raw;
  const parsed = parseStructuredBlock(structuredPart, {
    world: "worldType",
    vstyle: "visualStyle",
    shape: "shapeLanguage",
    color: "colorTheme",
    light: "lighting",
    mood: "mood",
    env: "environmentFeel",
  });
  return {
    worldType: String(parsed.worldType ?? ""),
    visualStyle: String(parsed.visualStyle ?? ""),
    shapeLanguage: String(parsed.shapeLanguage ?? ""),
    colorTheme: String(parsed.colorTheme ?? ""),
    lighting: String(parsed.lighting ?? ""),
    mood: String(parsed.mood ?? ""),
    environmentFeel: String(parsed.environmentFeel ?? ""),
    freeTags: [],
  };
}

export function parseWorldAudioStructured(raw: string): StructuredWorldAudio {
  const structuredPart = raw.split(WORLD_AUDIO_DETAILS_MARKER)[0] ?? raw;
  const parsed = parseStructuredBlock(structuredPart, {
    music: "musicStyle",
    ambience: "ambience",
    energy: "audioEnergy",
    voice: "voiceDirection",
    sound: "soundFeel",
  });
  return {
    musicStyle: String(parsed.musicStyle ?? ""),
    ambience: String(parsed.ambience ?? ""),
    audioEnergy: String(parsed.audioEnergy ?? ""),
    voiceDirection: String(parsed.voiceDirection ?? ""),
    soundFeel: String(parsed.soundFeel ?? ""),
    freeTags: [],
  };
}

export function parseWorldShotsStructured(raw: string): StructuredWorldShots {
  const parsed = parseStructuredBlock(raw, {
    camera: "cameraStyle",
    motion: "motionStyle",
    pacing: "pacing",
    shots: "preferredShots",
    forbidden_shots: "forbiddenShotStyles",
  });
  return {
    cameraStyle: String(parsed.cameraStyle ?? ""),
    motionStyle: String(parsed.motionStyle ?? ""),
    pacing: String(parsed.pacing ?? ""),
    preferredShots: String(parsed.preferredShots ?? ""),
    forbiddenShotStyles: String(parsed.forbiddenShotStyles ?? ""),
    freeTags: [],
  };
}

export function parseWorldContinuitySections(raw: string): {
  usageContext: string;
  shotsBlock: string;
  renderBlock: string;
  forbiddenElements: string;
  audioForbiddenElements: string;
  brandRules: string;
} {
  const markers = [
    WORLD_SHOTS_MARKER,
    WORLD_RENDER_MARKER,
    WORLD_FORBIDDEN_MARKER,
    WORLD_AUDIO_FORBIDDEN_MARKER,
    WORLD_BRAND_MARKER,
  ];

  const findSection = (marker: string): string => {
    const idx = raw.indexOf(marker);
    if (idx === -1) return "";
    const start = idx + marker.length;
    const nextStarts = markers
      .map((m) => raw.indexOf(m, start))
      .filter((n) => n >= 0);
    const end = nextStarts.length > 0 ? Math.min(...nextStarts) : raw.length;
    return raw.slice(start, end).trim();
  };

  const firstMarkerIdx = markers
    .map((m) => raw.indexOf(m))
    .filter((n) => n >= 0)
    .sort((a, b) => a - b)[0];

  const usageContext =
    firstMarkerIdx === undefined ? raw.trim() : raw.slice(0, firstMarkerIdx).trim();

  return {
    usageContext,
    shotsBlock: findSection(WORLD_SHOTS_MARKER),
    renderBlock: findSection(WORLD_RENDER_MARKER),
    forbiddenElements: findSection(WORLD_FORBIDDEN_MARKER),
    audioForbiddenElements: findSection(WORLD_AUDIO_FORBIDDEN_MARKER),
    brandRules: findSection(WORLD_BRAND_MARKER),
  };
}

export function buildWorldVisualField(
  structured: StructuredWorldVisual,
  visualDetails: string
): string {
  const encoded = encodeStructuredBlock([
    ["world", structured.worldType],
    ["vstyle", structured.visualStyle],
    ["shape", structured.shapeLanguage],
    ["color", structured.colorTheme],
    ["light", structured.lighting],
    ["mood", structured.mood],
    ["env", structured.environmentFeel],
  ]);
  const details = visualDetails.trim();
  if (!encoded && !details) return "";
  if (!encoded) return details;
  if (!details) return encoded;
  return `${encoded}\n\n${WORLD_VISUAL_DETAILS_MARKER}\n${details}`;
}

export function buildWorldToneField(
  structured: StructuredWorldAudio,
  audioDetails: string
): string {
  const encoded = encodeStructuredBlock([
    ["music", structured.musicStyle],
    ["ambience", structured.ambience],
    ["energy", structured.audioEnergy],
    ["voice", structured.voiceDirection],
    ["sound", structured.soundFeel],
  ]);
  const details = audioDetails.trim();
  if (!encoded && !details) return "";
  if (!encoded) return details;
  if (!details) return encoded;
  return `${encoded}\n\n${WORLD_AUDIO_DETAILS_MARKER}\n${details}`;
}

export function buildWorldContinuityField(params: {
  usageContext: string;
  shots: StructuredWorldShots;
  renderStrategies: string[];
  forbiddenElements: string;
  audioForbiddenElements: string;
  brandRules: string;
}): string {
  const parts: string[] = [];
  const usage = params.usageContext.trim();
  if (usage) parts.push(usage);

  const shotsEncoded = encodeStructuredBlock([
    ["camera", params.shots.cameraStyle],
    ["motion", params.shots.motionStyle],
    ["pacing", params.shots.pacing],
    ["shots", params.shots.preferredShots.replace(/,\s*/g, "|")],
    ["forbidden_shots", params.shots.forbiddenShotStyles.replace(/,\s*/g, "|")],
  ]);
  if (shotsEncoded) {
    parts.push(`${WORLD_SHOTS_MARKER}\n${shotsEncoded}`);
  }

  if (params.renderStrategies.length > 0) {
    parts.push(
      `${WORLD_RENDER_MARKER}\n${STRUCTURED_PREFIX}render=${params.renderStrategies.join("|")}`
    );
  }

  if (params.forbiddenElements.trim()) {
    parts.push(`${WORLD_FORBIDDEN_MARKER}\n${params.forbiddenElements.trim()}`);
  }
  if (params.audioForbiddenElements.trim()) {
    parts.push(`${WORLD_AUDIO_FORBIDDEN_MARKER}\n${params.audioForbiddenElements.trim()}`);
  }
  if (params.brandRules.trim()) {
    parts.push(`${WORLD_BRAND_MARKER}\n${params.brandRules.trim()}`);
  }

  return parts.join("\n\n");
}

export function parseWorldVisualDetails(raw: string): string {
  const idx = raw.indexOf(WORLD_VISUAL_DETAILS_MARKER);
  if (idx === -1) {
    const structured = parseWorldVisualStructured(raw);
    const hasStructured = Boolean(
      structured.worldType ||
        structured.visualStyle ||
        structured.shapeLanguage ||
        structured.colorTheme
    );
    return hasStructured ? "" : raw.trim();
  }
  return raw.slice(idx + WORLD_VISUAL_DETAILS_MARKER.length).trim();
}

export function parseWorldAudioDetails(raw: string): string {
  const idx = raw.indexOf(WORLD_AUDIO_DETAILS_MARKER);
  if (idx === -1) {
    const structured = parseWorldAudioStructured(raw);
    const hasStructured = Boolean(structured.musicStyle || structured.ambience);
    return hasStructured ? "" : raw.trim();
  }
  return raw.slice(idx + WORLD_AUDIO_DETAILS_MARKER.length).trim();
}

export function parseWorldRenderStrategies(raw: string): string[] {
  const idx = raw.indexOf(WORLD_RENDER_MARKER);
  if (idx === -1) return [];
  const block = raw.slice(idx + WORLD_RENDER_MARKER.length).split(WORLD_FORBIDDEN_MARKER)[0] ?? "";
  const match = block.match(/hc:render=([^\s,]+)/);
  if (!match?.[1]) return [];
  return match[1].split("|").map((s) => s.trim()).filter(Boolean);
}

export function extractWorldVisualKeywordString(visualStyle: string): string {
  const structured = parseWorldVisualStructured(visualStyle);
  return encodeStructuredBlock([
    ["world", structured.worldType],
    ["vstyle", structured.visualStyle],
    ["shape", structured.shapeLanguage],
    ["color", structured.colorTheme],
    ["light", structured.lighting],
    ["mood", structured.mood],
    ["env", structured.environmentFeel],
  ]);
}
