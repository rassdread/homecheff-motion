import type {
  StudioAudioAssetKind,
  StudioAudioChangeApplyTarget,
  StudioAudioChangePlan,
  StudioAudioChangePlanItem,
  StudioAudioChangePlanItemStatus,
  StudioAudioProjectAsset,
  StudioAudioProjectAssetsRegistry,
} from "@/types/studio-audio-change-plan";

export function createStudioAudioChangePlanItemId(): string {
  return `audio_plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createStudioAudioProjectAssetId(): string {
  return `audio_asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyStudioAudioChangePlan(storyboardId: string): StudioAudioChangePlan {
  return {
    version: 1,
    storyboardId,
    updatedAt: new Date(0).toISOString(),
    items: [],
  };
}

export function emptyStudioAudioProjectAssetsRegistry(
  storyboardId: string
): StudioAudioProjectAssetsRegistry {
  return {
    version: 1,
    storyboardId,
    updatedAt: new Date(0).toISOString(),
    assets: [],
  };
}

export function listStudioAudioChangePlanItems(
  plan: StudioAudioChangePlan
): StudioAudioChangePlanItem[] {
  return [...plan.items].sort((a, b) => a.order - b.order);
}

export function listPendingStudioAudioChangePlanItems(
  plan: StudioAudioChangePlan
): StudioAudioChangePlanItem[] {
  return listStudioAudioChangePlanItems(plan).filter((item) => item.status !== "done");
}

export function summarizeStudioAudioChangePlanItem(input: {
  kind: StudioAudioAssetKind;
  title: string;
  applyTarget: StudioAudioChangeApplyTarget;
  prompt?: string;
  voiceName?: string;
}): string {
  const target =
    input.applyTarget === "project"
      ? "project"
      : input.applyTarget === "scene"
        ? "scene"
        : "character";
  if (input.kind === "voice") {
    return `Set ${input.voiceName ?? "voice"} on ${target}`;
  }
  if (input.kind === "music") {
    return `Add music (${input.prompt?.trim() || input.title}) to ${target}`;
  }
  return `Add SFX (${input.prompt?.trim() || input.title}) to ${target}`;
}

export function addStudioAudioChangePlanItem(
  plan: StudioAudioChangePlan,
  partial: Omit<
    StudioAudioChangePlanItem,
    "id" | "order" | "selected" | "createdAt" | "status" | "instruction"
  > & {
    instruction?: string;
    status?: StudioAudioChangePlanItemStatus;
  }
): StudioAudioChangePlan {
  const order = plan.items.length;
  const item: StudioAudioChangePlanItem = {
    ...partial,
    id: createStudioAudioChangePlanItemId(),
    order,
    selected: true,
    status: partial.status ?? "planned",
    instruction:
      partial.instruction ??
      summarizeStudioAudioChangePlanItem({
        kind: partial.kind,
        title: partial.title,
        applyTarget: partial.applyTarget,
        prompt: partial.prompt,
        voiceName: partial.voiceName,
      }),
    createdAt: new Date().toISOString(),
  };
  return {
    ...plan,
    updatedAt: new Date().toISOString(),
    items: [...plan.items, item],
  };
}

export function updateStudioAudioChangePlanItem(
  plan: StudioAudioChangePlan,
  itemId: string,
  patch: Partial<StudioAudioChangePlanItem>
): StudioAudioChangePlan {
  return {
    ...plan,
    updatedAt: new Date().toISOString(),
    items: plan.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
  };
}

export function removeStudioAudioChangePlanItem(
  plan: StudioAudioChangePlan,
  itemId: string
): StudioAudioChangePlan {
  const items = plan.items
    .filter((item) => item.id !== itemId)
    .map((item, index) => ({ ...item, order: index }));
  return {
    ...plan,
    updatedAt: new Date().toISOString(),
    items,
  };
}

export function toggleStudioAudioChangePlanItemSelected(
  plan: StudioAudioChangePlan,
  itemId: string
): StudioAudioChangePlan {
  return updateStudioAudioChangePlanItem(plan, itemId, {
    selected: !plan.items.find((i) => i.id === itemId)?.selected,
  });
}

export function clearStudioAudioChangePlan(plan: StudioAudioChangePlan): StudioAudioChangePlan {
  return {
    ...plan,
    updatedAt: new Date().toISOString(),
    items: [],
  };
}

export function duplicateStudioAudioChangePlanItem(
  plan: StudioAudioChangePlan,
  itemId: string
): StudioAudioChangePlan {
  const source = plan.items.find((item) => item.id === itemId);
  if (!source) {
    return plan;
  }
  return addStudioAudioChangePlanItem(plan, {
    ...source,
    title: `${source.title} (copy)`,
    source: "user",
    status: "planned",
  });
}

export function addStudioAudioProjectAsset(
  registry: StudioAudioProjectAssetsRegistry,
  partial: Omit<StudioAudioProjectAsset, "id" | "createdAt">
): StudioAudioProjectAssetsRegistry {
  const asset: StudioAudioProjectAsset = {
    ...partial,
    id: createStudioAudioProjectAssetId(),
    createdAt: new Date().toISOString(),
  };
  return {
    ...registry,
    updatedAt: new Date().toISOString(),
    assets: [...registry.assets, asset],
  };
}

export function listStudioAudioProjectAssetsByKind(
  registry: StudioAudioProjectAssetsRegistry,
  kind: StudioAudioAssetKind
): StudioAudioProjectAsset[] {
  return registry.assets.filter((asset) => asset.kind === kind);
}

export function estimateStudioAudioChangePlanCredits(
  items: StudioAudioChangePlanItem[]
): number {
  return items.reduce((sum, item) => sum + (item.estimatedCostCredits ?? 0), 0);
}
