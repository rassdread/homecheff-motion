import { buildMotionAudioAssetHandoffPlan } from "@/lib/studio-audio-asset-director";
import type { MotionHandoffPayload, MotionHandoffScene } from "@/types/motion-handoff-payload";
import type { MotionSceneAudioAssetHandoff } from "@/types/studio-audio-asset-director";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export function attachAudioAssetToHandoffPayload(
  payload: MotionHandoffPayload,
  options: { storyboard: StudioStoryboardDetail }
): MotionHandoffPayload {
  const audioAssetPlan = buildMotionAudioAssetHandoffPlan(options.storyboard);
  const pkgByScene = new Map(audioAssetPlan.scenePackages.map((p) => [p.sceneId, p]));

  const scenes: MotionHandoffScene[] = payload.scenes.map((scene) => {
    const pkg = pkgByScene.get(scene.sceneId);
    if (!pkg) {
      return scene;
    }
    const handoffPkg: MotionSceneAudioAssetHandoff = {
      voiceAssets: pkg.voiceAssets,
      musicAssets: pkg.musicAssets,
      ambienceAssets: pkg.ambienceAssets,
      sfxAssets: pkg.sfxAssets,
    };
    const assetLabel = [
      ...pkg.voiceAssets.map((a) => a.assetName),
      ...pkg.musicAssets.map((a) => a.assetName),
      ...pkg.sfxAssets.slice(0, 2).map((a) => a.assetName),
    ]
      .filter(Boolean)
      .join(", ");
    return {
      ...scene,
      sceneAudioAssetPackage: handoffPkg,
      studioContext: {
        ...scene.studioContext,
        audioAssets: assetLabel || undefined,
      },
    };
  });

  return {
    ...payload,
    audioAssetPlan,
    assignedVoiceAssets: audioAssetPlan.assignedVoiceAssets,
    assignedMusicAssets: audioAssetPlan.assignedMusicAssets,
    assignedSoundAssets: audioAssetPlan.assignedSoundAssets,
    assetWarnings: audioAssetPlan.assetWarnings,
    scenes,
  };
}
