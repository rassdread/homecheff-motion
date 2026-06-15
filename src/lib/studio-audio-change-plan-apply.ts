/**
 * Apply approved Studio V9 audio change plan items to storyboard/character assets.
 */

import { formatLibraryVoiceProfileRef } from "@/lib/studio-voice-profile-ref";
import { updateStudioCharacterApi } from "@/lib/studio-characters-client";
import { linkStoryboardAudioAssetsApi, fetchUserAudioLibraryApi } from "@/lib/studio-audio-library-client";
import { updateStudioStoryboardApi } from "@/lib/studio-storyboards-client";
import {
  addStudioAudioProjectAsset,
  updateStudioAudioChangePlanItem,
} from "@/lib/studio-audio-change-plan";
import {
  loadStudioAudioProjectAssets,
  saveStudioAudioChangePlan,
  saveStudioAudioProjectAssets,
} from "@/lib/studio-audio-change-plan-storage";
import type { StudioAudioChangePlan, StudioAudioChangePlanItem } from "@/types/studio-audio-change-plan";

export type ApplyStudioAudioChangePlanResult = {
  plan: StudioAudioChangePlan;
  appliedCount: number;
  failedCount: number;
};

async function applyVoiceItem(
  item: StudioAudioChangePlanItem,
  storyboardId: string
): Promise<void> {
  const voiceProfile =
    item.voiceProfile ??
    (item.voiceId ? formatLibraryVoiceProfileRef(item.voiceId) : undefined);
  if (!voiceProfile) {
    throw new Error("missing_voice_profile");
  }

  if (item.applyTarget === "character" && item.characterId) {
    const res = await updateStudioCharacterApi(item.characterId, {
      voiceEnabled: true,
      voiceProvider: "elevenlabs",
      voiceProfile,
      voiceDescription: item.voiceName ?? item.title,
    });
    if (!res.ok) {
      throw new Error("character_update_failed");
    }
    return;
  }

  if (item.applyTarget === "project") {
    const res = await updateStudioStoryboardApi(storyboardId, {
      voiceEnabled: true,
      voiceProfile,
    });
    if (!res.ok) {
      throw new Error("storyboard_update_failed");
    }
  }
}

async function applyMusicItem(
  item: StudioAudioChangePlanItem,
  storyboardId: string
): Promise<{ libraryAssetId?: string; audioUrl?: string }> {
  const libraryRes = await fetchUserAudioLibraryApi();
  const assets = libraryRes.ok ? (libraryRes.data.assets ?? []) : [];
  const match =
    assets.find((a) => a.kind === "music" && a.name === item.title) ??
    assets.find((a) => a.kind === "music");

  if (match) {
    const linkRes = await linkStoryboardAudioAssetsApi(storyboardId, {
      musicAssetId: match.id,
    });
    if (!linkRes.ok) {
      throw new Error(
        (linkRes.data as { error?: string }).error ?? "music_link_failed"
      );
    }
    return { libraryAssetId: match.id, audioUrl: match.audioUrl };
  }

  return {};
}

async function applySfxItem(
  item: StudioAudioChangePlanItem,
  storyboardId: string
): Promise<{ libraryAssetId?: string; audioUrl?: string }> {
  const libraryRes = await fetchUserAudioLibraryApi();
  const assets = libraryRes.ok ? (libraryRes.data.assets ?? []) : [];
  const match =
    assets.find(
      (a) =>
        a.kind === "sfx" &&
        (item.sfxCategory ? a.category === item.sfxCategory : true)
    ) ?? assets.find((a) => a.kind === "sfx");

  if (match) {
    const linkRes = await linkStoryboardAudioAssetsApi(storyboardId, {
      soundAssetId: match.id,
    });
    if (!linkRes.ok) {
      throw new Error(
        (linkRes.data as { error?: string }).error ?? "sfx_link_failed"
      );
    }
    return { libraryAssetId: match.id, audioUrl: match.audioUrl };
  }

  return {};
}

export async function applyStudioAudioChangePlanItem(
  plan: StudioAudioChangePlan,
  itemId: string,
  storyboardId: string
): Promise<StudioAudioChangePlan> {
  const item = plan.items.find((row) => row.id === itemId);
  if (!item) {
    return plan;
  }

  let next = updateStudioAudioChangePlanItem(plan, itemId, { status: "generating" });
  saveStudioAudioChangePlan(next);

  try {
    if (item.kind === "voice") {
      await applyVoiceItem(item, storyboardId);
      let assets = loadStudioAudioProjectAssets(storyboardId);
      assets = addStudioAudioProjectAsset(assets, {
        kind: "voice",
        provider: item.provider ?? "elevenlabs",
        providerAssetId: item.voiceId,
        previewUrl: item.previewUrl,
        appliedTo: item.applyTarget,
        sceneId: item.sceneId,
        characterId: item.characterId,
        voiceProfile: item.voiceProfile,
      });
      saveStudioAudioProjectAssets(assets);
    } else if (item.kind === "music") {
      const linked = await applyMusicItem(item, storyboardId);
      let assets = loadStudioAudioProjectAssets(storyboardId);
      assets = addStudioAudioProjectAsset(assets, {
        kind: "music",
        provider: item.provider ?? "elevenlabs_music",
        providerAssetId: item.providerAssetId,
        audioUrl: linked.audioUrl ?? item.audioUrl,
        previewUrl: item.previewUrl,
        durationSeconds: item.durationSeconds,
        prompt: item.prompt,
        appliedTo: item.applyTarget,
        sceneId: item.sceneId,
        libraryAssetId: linked.libraryAssetId,
      });
      saveStudioAudioProjectAssets(assets);
    } else {
      const linked = await applySfxItem(item, storyboardId);
      let assets = loadStudioAudioProjectAssets(storyboardId);
      assets = addStudioAudioProjectAsset(assets, {
        kind: "sound_effect",
        provider: item.provider ?? "elevenlabs_sfx",
        providerAssetId: item.providerAssetId,
        audioUrl: linked.audioUrl ?? item.audioUrl,
        previewUrl: item.previewUrl,
        durationSeconds: item.durationSeconds,
        prompt: item.prompt ?? item.sfxCategory,
        appliedTo: item.applyTarget,
        sceneId: item.sceneId,
        libraryAssetId: linked.libraryAssetId,
      });
      saveStudioAudioProjectAssets(assets);
    }

    next = updateStudioAudioChangePlanItem(next, itemId, { status: "done" });
  } catch (err) {
    next = updateStudioAudioChangePlanItem(next, itemId, {
      status: "failed",
      errorMessage: err instanceof Error ? err.message : "apply_failed",
    });
  }

  saveStudioAudioChangePlan(next);
  return next;
}

export async function applySelectedStudioAudioChangePlan(
  plan: StudioAudioChangePlan,
  storyboardId: string
): Promise<ApplyStudioAudioChangePlanResult> {
  const selected = plan.items.filter((item) => item.selected && item.status !== "done");
  let next = plan;
  let appliedCount = 0;
  let failedCount = 0;

  for (const item of selected) {
    next = await applyStudioAudioChangePlanItem(next, item.id, storyboardId);
    const updated = next.items.find((row) => row.id === item.id);
    if (updated?.status === "done") {
      appliedCount += 1;
    } else {
      failedCount += 1;
    }
  }

  return { plan: next, appliedCount, failedCount };
}

export async function applyAllStudioAudioChangePlan(
  plan: StudioAudioChangePlan,
  storyboardId: string
): Promise<ApplyStudioAudioChangePlanResult> {
  const next = {
    ...plan,
    items: plan.items.map((item) =>
      item.status === "done" ? item : { ...item, selected: true }
    ),
  };
  saveStudioAudioChangePlan(next);
  return applySelectedStudioAudioChangePlan(next, storyboardId);
}
