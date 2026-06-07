/**
 * Studio V2 — Production Memory profile builder.
 * Detects, summarizes, and recommends from existing production data (no ML, no AI).
 */

import type { StudioCharacterListItem, StudioWorldProfileListItem } from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type {
  BuildProductionMemoryProfileInput,
  ProductionMemoryAudioStyleEntry,
  ProductionMemoryCreationGuidance,
  ProductionMemoryPattern,
  ProductionMemoryPatternId,
  ProductionMemoryProfile,
  ProductionMemoryRecurringEntry,
  ProductionMemoryRecord,
  ProductionMemoryVoiceEntry,
  ProductionMemoryContext,
} from "@/types/studio-production-memory";
import type { StudioRenderStrategy } from "@/types/studio-render-strategy";

const MIN_PATTERN_MATCHES = 2;
const MIN_RECURRING_COUNT = 2;

type PatternSignal = {
  id: ProductionMemoryPatternId;
  labelKey: string;
  test: RegExp;
};

const PATTERN_SIGNALS: PatternSignal[] = [
  {
    id: "homecheff_promo",
    labelKey: "studio.productionMemory.pattern.homecheffPromo",
    test: /\b(homecheff|home cheff|chef marco|hc world|homecheff world)\b/i,
  },
  {
    id: "garden_promo",
    labelKey: "studio.productionMemory.pattern.gardenPromo",
    test: /\b(garden|tuin|groente|vegetable|moestuin|harvest|oogst)\b/i,
  },
  {
    id: "designer_promo",
    labelKey: "studio.productionMemory.pattern.designerPromo",
    test: /\b(designer|local maker|ambacht|craft|artisan|atelier|handmade)\b/i,
  },
  {
    id: "affiliate_promo",
    labelKey: "studio.productionMemory.pattern.affiliatePromo",
    test: /\b(affiliate|partner|commission|referral|influencer|creator deal)\b/i,
  },
  {
    id: "sports_promo",
    labelKey: "studio.productionMemory.pattern.sportsPromo",
    test: /\b(sport|voetbal|football|soccer|nike|athletic|stadium|stadion|mascot)\b/i,
  },
];

const RENDER_STRATEGY_LABEL: Record<StudioRenderStrategy, string> = {
  story: "studio.productionMemory.renderStrategy.story",
  action_chain: "studio.productionMemory.renderStrategy.actionChain",
  hybrid: "studio.productionMemory.renderStrategy.hybrid",
};

function productionRecordsFromMemory(memory: StudioProjectMemorySnapshot): ProductionMemoryRecord[] {
  return memory.productionRecords ?? [];
}

function haystackForRecord(record: ProductionMemoryRecord): string {
  return [record.title, record.ideaText, record.directorProfile, record.promptStyleProfile]
    .filter(Boolean)
    .join(" ");
}

function scorePattern(record: ProductionMemoryRecord, signal: PatternSignal): number {
  return signal.test.test(haystackForRecord(record)) ? 1 : 0;
}

function detectPatternForText(text: string): ProductionMemoryPatternId | null {
  for (const signal of PATTERN_SIGNALS) {
    if (signal.test.test(text)) {
      return signal.id;
    }
  }
  return null;
}

function roundAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function bucketDuration(seconds: number): string {
  if (seconds <= 30) {
    return "short";
  }
  if (seconds <= 45) {
    return "medium";
  }
  if (seconds <= 60) {
    return "standard";
  }
  return "long";
}

function bucketShots(shots: number): string {
  if (shots <= 6) {
    return "compact";
  }
  if (shots <= 9) {
    return "balanced";
  }
  return "extended";
}

function structureLabel(sceneCount: number, directorProfile: string): string {
  if (sceneCount <= 3) {
    return "short_arc";
  }
  if (sceneCount <= 5) {
    return directorProfile === "documentary" ? "documentary_arc" : "classic_arc";
  }
  return "extended_arc";
}

function buildProductionPatterns(records: ProductionMemoryRecord[]): ProductionMemoryPattern[] {
  const patterns: ProductionMemoryPattern[] = [];

  for (const signal of PATTERN_SIGNALS) {
    const matched = records.filter((r) => scorePattern(r, signal) > 0);
    if (matched.length < MIN_PATTERN_MATCHES) {
      continue;
    }
    patterns.push({
      id: signal.id,
      labelKey: signal.labelKey,
      matchCount: matched.length,
      confidence:
        matched.length >= 5 ? "high"
        : matched.length >= 3 ? "medium"
        : "low",
      averageDurationSeconds: roundAverage(matched.map((r) => r.durationSeconds)),
      averageShotCount: roundAverage(matched.map((r) => r.shotCount)),
      averageSceneCount: roundAverage(matched.map((r) => r.sceneCount)),
      signalKeys: [`studio.productionMemory.patternSignal.${signal.id}`],
    });
  }

  return patterns.sort((a, b) => b.matchCount - a.matchCount);
}

function topByFrequency<T>(
  items: T[],
  keyFn: (item: T) => string,
  labelFn: (item: T, key: string) => ProductionMemoryRecurringEntry
): ProductionMemoryRecurringEntry[] {
  const counts = new Map<string, { item: T; count: number }>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) {
      continue;
    }
    const entry = counts.get(key) ?? { item, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()]
    .filter((e) => e.count >= MIN_RECURRING_COUNT)
    .sort((a, b) => b.count - a.count)
    .map((e) => labelFn(e.item, keyFn(e.item)));
}

function buildRecurringStyles(
  records: ProductionMemoryRecord[],
  memory: StudioProjectMemorySnapshot
): ProductionMemoryRecurringEntry[] {
  const fromRecords = topByFrequency(
    records,
    (r) => `${r.promptStyleProfile}::${r.directorProfile}`,
    (r, key) => ({
      id: `style-${key}`,
      label: `${r.promptStyleProfile} / ${r.directorProfile}`,
      labelKey: "studio.productionMemory.recurring.stylePair",
      count: 0,
      storyboardCount: 0,
      params: {
        style: r.promptStyleProfile,
        director: r.directorProfile,
      },
    })
  );

  if (fromRecords.length > 0) {
    return fromRecords.map((entry) => {
      const styleKey = entry.id.replace("style-", "");
      const styleEntry = memory.styles.find(
        (s) => `${s.promptStyleProfile}::${s.directorProfile}` === styleKey
      );
      return {
        ...entry,
        count: styleEntry?.storyboardCount ?? entry.count,
        storyboardCount: styleEntry?.storyboardCount ?? entry.count,
      };
    });
  }

  return memory.styles
    .filter((s) => s.storyboardCount >= MIN_RECURRING_COUNT)
    .slice(0, 5)
    .map((s) => ({
      id: `style-${s.promptStyleProfile}-${s.directorProfile}`,
      label: `${s.promptStyleProfile} / ${s.directorProfile}`,
      labelKey: "studio.productionMemory.recurring.stylePair",
      count: s.storyboardCount,
      storyboardCount: s.storyboardCount,
      params: {
        style: s.promptStyleProfile,
        director: s.directorProfile,
      },
    }));
}

function resolveWorldName(
  worldId: string,
  worlds?: StudioWorldProfileListItem[]
): string {
  const world = worlds?.find((w) => w.id === worldId);
  return world?.name?.trim() || worldId;
}

function resolveCharacterName(
  characterId: string,
  characters?: StudioCharacterListItem[]
): string {
  const character = characters?.find((c) => c.id === characterId);
  return character?.name?.trim() || characterId;
}

function buildRecurringWorlds(
  records: ProductionMemoryRecord[],
  memory: StudioProjectMemorySnapshot,
  worlds?: StudioWorldProfileListItem[]
): ProductionMemoryRecurringEntry[] {
  const worldIds: string[] = [];
  for (const record of records) {
    worldIds.push(...record.dominantWorldIds);
  }

  const fromRecords = topByFrequency(
    worldIds.map((id) => ({ id })),
    (w) => w.id,
    (w) => ({
      id: `world-${w.id}`,
      label: resolveWorldName(w.id, worlds),
      labelKey: "studio.productionMemory.recurring.world",
      count: 0,
      storyboardCount: 0,
      params: { name: resolveWorldName(w.id, worlds) },
    })
  );

  if (fromRecords.length > 0) {
    return fromRecords.map((entry) => {
      const worldId = entry.id.replace("world-", "");
      const usage = memory.worlds[worldId];
      return {
        ...entry,
        count: usage?.storyboardCount ?? entry.count,
        storyboardCount: usage?.storyboardCount ?? entry.count,
      };
    });
  }

  return Object.entries(memory.worlds)
    .filter(([, usage]) => usage.storyboardCount >= MIN_RECURRING_COUNT)
    .sort((a, b) => b[1].storyboardCount - a[1].storyboardCount)
    .slice(0, 5)
    .map(([worldId, usage]) => ({
      id: `world-${worldId}`,
      label: resolveWorldName(worldId, worlds),
      labelKey: "studio.productionMemory.recurring.world",
      count: usage.storyboardCount,
      storyboardCount: usage.storyboardCount,
      params: { name: resolveWorldName(worldId, worlds) },
    }));
}

function buildRecurringStructures(records: ProductionMemoryRecord[]): ProductionMemoryRecurringEntry[] {
  return topByFrequency(
    records,
    (r) => structureLabel(r.sceneCount, r.directorProfile),
    (r, key) => ({
      id: `structure-${key}`,
      label: key,
      labelKey: `studio.productionMemory.structure.${key}`,
      count: 0,
      storyboardCount: 0,
      params: { scenes: String(r.sceneCount) },
    })
  ).map((entry) => {
    const matched = records.filter(
      (r) => structureLabel(r.sceneCount, r.directorProfile) === entry.label
    );
    return {
      ...entry,
      count: matched.length,
      storyboardCount: matched.length,
    };
  });
}

function buildRecurringRenderStrategies(records: ProductionMemoryRecord[]): ProductionMemoryRecurringEntry[] {
  return topByFrequency(
    records.filter((r) => r.renderStrategy),
    (r) => r.renderStrategy!,
    (r, key) => ({
      id: `render-${key}`,
      label: key,
      labelKey: RENDER_STRATEGY_LABEL[key as StudioRenderStrategy],
      count: 0,
      storyboardCount: 0,
    })
  ).map((entry) => {
    const matched = records.filter((r) => r.renderStrategy === entry.label);
    return {
      ...entry,
      count: matched.length,
      storyboardCount: matched.length,
    };
  });
}

function buildRecurringDurations(records: ProductionMemoryRecord[]): ProductionMemoryRecurringEntry[] {
  return topByFrequency(
    records.filter((r) => r.durationSeconds > 0),
    (r) => bucketDuration(r.durationSeconds),
    (r, key) => ({
      id: `duration-${key}`,
      label: key,
      labelKey: `studio.productionMemory.duration.${key}`,
      count: 0,
      storyboardCount: 0,
      params: { seconds: String(roundAverage(records.filter((x) => bucketDuration(x.durationSeconds) === key).map((x) => x.durationSeconds))) },
    })
  ).map((entry) => {
    const matched = records.filter((r) => bucketDuration(r.durationSeconds) === entry.label);
    return {
      ...entry,
      count: matched.length,
      storyboardCount: matched.length,
    };
  });
}

function buildRecurringShotCounts(records: ProductionMemoryRecord[]): ProductionMemoryRecurringEntry[] {
  return topByFrequency(
    records.filter((r) => r.shotCount > 0),
    (r) => bucketShots(r.shotCount),
    (r, key) => ({
      id: `shots-${key}`,
      label: key,
      labelKey: `studio.productionMemory.shots.${key}`,
      count: 0,
      storyboardCount: 0,
      params: {
        shots: String(
          roundAverage(records.filter((x) => bucketShots(x.shotCount) === key).map((x) => x.shotCount))
        ),
      },
    })
  ).map((entry) => {
    const matched = records.filter((r) => bucketShots(r.shotCount) === entry.label);
    return {
      ...entry,
      count: matched.length,
      storyboardCount: matched.length,
    };
  });
}

function buildRecurringAssetTypes(memory: StudioProjectMemorySnapshot): ProductionMemoryRecurringEntry[] {
  const kinds = [
    { kind: "character", map: memory.characters, labelKey: "studio.productionMemory.assetType.characters" },
    { kind: "location", map: memory.locations, labelKey: "studio.productionMemory.assetType.locations" },
    { kind: "prop", map: memory.props, labelKey: "studio.productionMemory.assetType.props" },
    { kind: "world", map: memory.worlds, labelKey: "studio.productionMemory.assetType.worlds" },
  ] as const;

  return kinds
    .map(({ kind, map, labelKey }) => {
      const activeCount = Object.values(map).filter((u) => u.storyboardCount >= MIN_RECURRING_COUNT).length;
      return {
        id: `asset-${kind}`,
        label: kind,
        labelKey,
        count: activeCount,
        storyboardCount: activeCount,
      };
    })
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);
}

function buildRecurringVoiceTypes(memory: StudioProjectMemorySnapshot): ProductionMemoryVoiceEntry[] {
  return memory.voices
    .filter((v) => v.storyboardCount >= MIN_RECURRING_COUNT)
    .slice(0, 6)
    .map((v) => ({
      profileId: v.profileId,
      labelKey: v.labelKey,
      storyboardCount: v.storyboardCount,
      characterCount: v.characterCount,
    }));
}

function frequencyAudioStyles(
  records: ProductionMemoryRecord[],
  keyFn: (record: ProductionMemoryRecord) => string,
  kind: ProductionMemoryAudioStyleEntry["kind"],
  labelKey: string
): ProductionMemoryAudioStyleEntry[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = keyFn(record);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= MIN_RECURRING_COUNT)
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({
      id: `${kind}-${value}`,
      labelKey,
      kind,
      count,
    }));
}

function buildRecurringAudioStyles(
  records: ProductionMemoryRecord[],
  memory: StudioProjectMemorySnapshot
): ProductionMemoryAudioStyleEntry[] {
  const styles: ProductionMemoryAudioStyleEntry[] = [];

  for (const voice of memory.voices.filter((v) => v.storyboardCount >= MIN_RECURRING_COUNT).slice(0, 3)) {
    styles.push({
      id: `voice-${voice.profileId}`,
      labelKey: voice.labelKey,
      kind: "voice",
      count: voice.storyboardCount,
    });
  }

  const musicStyles = frequencyAudioStyles(
    records.filter((r) => r.musicStyle?.trim()),
    (r) => r.musicStyle!.trim(),
    "music",
    "studio.productionMemory.audio.musicStyle"
  );

  const soundStyles = frequencyAudioStyles(
    records.filter((r) => r.soundStyle?.trim()),
    (r) => r.soundStyle!.trim(),
    "sound",
    "studio.productionMemory.audio.soundStyle"
  );

  if (memory.narrationAudio.length >= MIN_RECURRING_COUNT) {
    styles.push({
      id: "narration-uploads",
      labelKey: "studio.productionMemory.audio.narrationUploads",
      kind: "narration",
      count: memory.narrationAudio.length,
    });
  }

  return [...styles, ...musicStyles, ...soundStyles].slice(0, 8);
}

function buildTopCharacters(
  memory: StudioProjectMemorySnapshot,
  characters?: StudioCharacterListItem[]
): ProductionMemoryRecurringEntry[] {
  return Object.entries(memory.characters)
    .filter(([, usage]) => usage.storyboardCount >= MIN_RECURRING_COUNT)
    .sort((a, b) => b[1].storyboardCount - a[1].storyboardCount)
    .slice(0, 5)
    .map(([characterId, usage]) => ({
      id: `char-${characterId}`,
      label: resolveCharacterName(characterId, characters),
      labelKey: "studio.productionMemory.recurring.character",
      count: usage.storyboardCount,
      storyboardCount: usage.storyboardCount,
      params: { name: resolveCharacterName(characterId, characters) },
    }));
}

function findSimilarProductions(
  records: ProductionMemoryRecord[],
  idea: string
): ProductionMemoryRecord[] {
  const patternId = detectPatternForText(idea);
  if (patternId) {
    const signal = PATTERN_SIGNALS.find((s) => s.id === patternId);
    if (signal) {
      const matched = records.filter((r) => scorePattern(r, signal) > 0);
      if (matched.length >= MIN_PATTERN_MATCHES) {
        return matched;
      }
    }
  }

  const ideaLower = idea.toLowerCase();
  const tokens = ideaLower.split(/\W+/).filter((t) => t.length >= 4);
  return records.filter((r) => {
    const hay = haystackForRecord(r).toLowerCase();
    const overlap = tokens.filter((t) => hay.includes(t)).length;
    return overlap >= 2;
  });
}

function buildCreationGuidance(params: {
  records: ProductionMemoryRecord[];
  profile: Omit<ProductionMemoryProfile, "creationGuidance" | "directorContextLines">;
  currentIdea?: string;
  libraries?: BuildProductionMemoryProfileInput["libraries"];
}): ProductionMemoryCreationGuidance | null {
  const { records, profile, currentIdea, libraries } = params;
  if (records.length < MIN_PATTERN_MATCHES) {
    return null;
  }

  const similar =
    currentIdea?.trim() ? findSimilarProductions(records, currentIdea.trim()) : records.slice(0, 12);

  if (similar.length < MIN_PATTERN_MATCHES && records.length < MIN_PATTERN_MATCHES) {
    return null;
  }

  const pool = similar.length >= MIN_PATTERN_MATCHES ? similar : records;
  const avgDuration = roundAverage(pool.map((r) => r.durationSeconds));
  const avgShots = roundAverage(pool.map((r) => r.shotCount));
  const avgScenes = roundAverage(pool.map((r) => r.sceneCount));

  const topPattern = profile.productionPatterns[0];
  const topWorld = profile.recurringWorlds[0];
  const topCharacter = profile.topCharacters[0];
  const topRender = profile.recurringRenderStrategies[0];
  const topStyle = profile.recurringStyles[0];

  const patternId =
    currentIdea?.trim() ? detectPatternForText(currentIdea) ?? topPattern?.id : topPattern?.id;

  const patternLabelKey =
    PATTERN_SIGNALS.find((s) => s.id === patternId)?.labelKey ?? topPattern?.labelKey;

  const startParts: string[] = [];
  if (avgDuration > 0) {
    startParts.push(`${avgDuration}s`);
  }
  if (avgShots > 0) {
    startParts.push(`${avgShots} shots`);
  }
  if (topWorld?.params?.name) {
    startParts.push(topWorld.params.name);
  }
  if (topCharacter?.params?.name) {
    startParts.push(topCharacter.params.name);
  }

  return {
    id: "creation-guidance-primary",
    patternId: patternId ?? undefined,
    patternLabelKey,
    similarProductionCount: pool.length,
    averageDurationSeconds: avgDuration,
    averageShotCount: avgShots,
    averageSceneCount: avgScenes,
    suggestedWorldName: topWorld?.params?.name,
    suggestedWorldId: topWorld ? topWorld.id.replace("world-", "") : undefined,
    suggestedCharacterName: topCharacter?.params?.name,
    suggestedCharacterId: topCharacter ? topCharacter.id.replace("char-", "") : undefined,
    suggestedRenderStrategy: topRender?.label as StudioRenderStrategy | undefined,
    suggestedStyleLabelKey: topStyle?.labelKey,
    messageKey: "studio.productionMemory.guidance.similarProductions",
    messageParams: {
      count: String(pool.length),
      duration: String(avgDuration),
      shots: String(avgShots),
    },
    startWithSuggestionKey:
      startParts.length > 0 ? "studio.productionMemory.guidance.startWith" : undefined,
    startWithParams:
      startParts.length > 0
        ? {
            duration: String(avgDuration),
            shots: String(avgShots),
            world: topWorld?.params?.name ?? "",
            character: topCharacter?.params?.name ?? "",
          }
        : undefined,
  };
}

function buildDirectorContextLines(profile: ProductionMemoryProfile): string[] {
  const lines: string[] = [];
  if (profile.totalProductions >= MIN_PATTERN_MATCHES) {
    lines.push(`memory:productions:${profile.totalProductions}`);
  }
  if (profile.averageDurationSeconds > 0) {
    lines.push(`memory:avgDuration:${profile.averageDurationSeconds}s`);
  }
  if (profile.averageShotCount > 0) {
    lines.push(`memory:avgShots:${profile.averageShotCount}`);
  }
  const topPattern = profile.productionPatterns[0];
  if (topPattern) {
    lines.push(`memory:pattern:${topPattern.id}:${topPattern.matchCount}`);
  }
  const topRender = profile.recurringRenderStrategies[0];
  if (topRender) {
    lines.push(`memory:render:${topRender.label}`);
  }
  const topVoice = profile.recurringVoiceTypes[0];
  if (topVoice) {
    lines.push(`memory:voice:${topVoice.profileId}`);
  }
  return lines;
}

export function emptyProductionMemoryProfile(): ProductionMemoryProfile {
  return {
    version: 1,
    totalProductions: 0,
    averageDurationSeconds: 0,
    averageShotCount: 0,
    averageSceneCount: 0,
    productionPatterns: [],
    recurringStyles: [],
    recurringWorlds: [],
    recurringStructures: [],
    recurringRenderStrategies: [],
    recurringDurations: [],
    recurringShotCounts: [],
    recurringAssetTypes: [],
    recurringVoiceTypes: [],
    recurringAudioStyles: [],
    topCharacters: [],
    creationGuidance: null,
    directorContextLines: [],
  };
}

/**
 * Build a production memory profile from project memory and optional current idea.
 * Advisory only — never mutates plans or blocks creation.
 */
export function buildProductionMemoryProfile(
  input: BuildProductionMemoryProfileInput
): ProductionMemoryProfile {
  const records = productionRecordsFromMemory(input.memory);
  const totalProductions = records.length;

  if (totalProductions === 0 && Object.keys(input.memory.characters).length === 0) {
    return emptyProductionMemoryProfile();
  }

  const averageDurationSeconds = roundAverage(
    records.filter((r) => r.durationSeconds > 0).map((r) => r.durationSeconds)
  );
  const averageShotCount = roundAverage(
    records.filter((r) => r.shotCount > 0).map((r) => r.shotCount)
  );
  const averageSceneCount = roundAverage(
    records.filter((r) => r.sceneCount > 0).map((r) => r.sceneCount)
  );

  const partial = {
    version: 1 as const,
    totalProductions,
    averageDurationSeconds,
    averageShotCount,
    averageSceneCount,
    productionPatterns: buildProductionPatterns(records),
    recurringStyles: buildRecurringStyles(records, input.memory),
    recurringWorlds: buildRecurringWorlds(records, input.memory, input.libraries?.worlds),
    recurringStructures: buildRecurringStructures(records),
    recurringRenderStrategies: buildRecurringRenderStrategies(records),
    recurringDurations: buildRecurringDurations(records),
    recurringShotCounts: buildRecurringShotCounts(records),
    recurringAssetTypes: buildRecurringAssetTypes(input.memory),
    recurringVoiceTypes: buildRecurringVoiceTypes(input.memory),
    recurringAudioStyles: buildRecurringAudioStyles(records, input.memory),
    topCharacters: buildTopCharacters(input.memory, input.libraries?.characters),
  };

  const creationGuidance = buildCreationGuidance({
    records,
    profile: partial,
    currentIdea: input.currentIdea,
    libraries: input.libraries,
  });

  const profile: ProductionMemoryProfile = {
    ...partial,
    creationGuidance,
    directorContextLines: [],
  };
  profile.directorContextLines = buildDirectorContextLines(profile);
  return profile;
}

export function buildProductionMemoryContext(
  input: BuildProductionMemoryProfileInput
): ProductionMemoryContext {
  const profile = buildProductionMemoryProfile(input);
  const recommendationKeys: string[] = [];

  if (profile.creationGuidance) {
    recommendationKeys.push(profile.creationGuidance.messageKey);
    if (profile.creationGuidance.startWithSuggestionKey) {
      recommendationKeys.push(profile.creationGuidance.startWithSuggestionKey);
    }
  }
  if (profile.recurringRenderStrategies[0]) {
    recommendationKeys.push("studio.productionMemory.recommendation.renderStrategy");
  }
  if (profile.recurringVoiceTypes[0]) {
    recommendationKeys.push("studio.productionMemory.recommendation.voice");
  }

  return {
    profile,
    contextLines: profile.directorContextLines,
    recommendationKeys: recommendationKeys.slice(0, 6),
  };
}

export function enrichIdeaWithProductionMemory(
  idea: string,
  context: ProductionMemoryContext
): string {
  if (context.contextLines.length === 0) {
    return idea;
  }
  return `[Production memory: ${context.contextLines.join("; ")}]\n${idea.trim()}`.trim();
}

export { PATTERN_SIGNALS, detectPatternForText, findSimilarProductions };
