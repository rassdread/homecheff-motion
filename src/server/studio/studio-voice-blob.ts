import { uploadPublicBlob } from "@/lib/vercel-blob-config";

export async function uploadStoryboardVoiceAudio(params: {
  ownerId: string;
  storyboardId: string;
  language: string;
  voiceAssetId: string;
  audioBuffer: Buffer;
  contentType: string;
  extension?: string;
}): Promise<{ audioUrl: string; storageKey: string }> {
  const ext =
    params.extension?.trim().toLowerCase()
    || (params.contentType.includes("wav") ? "wav"
      : params.contentType.includes("m4a") || params.contentType.includes("mp4") ? "m4a"
      : "mp3");
  const pathname = `studio/${params.ownerId}/storyboards/${params.storyboardId}/voice/${params.language}/${params.voiceAssetId}.${ext}`;
  const uploaded = await uploadPublicBlob({
    pathname,
    body: params.audioBuffer,
    contentType: params.contentType,
    allowOverwrite: true,
    context: {
      uploadTarget: pathname,
      provider: "studio_storyboard_voice",
    },
  });
  return { audioUrl: uploaded.url, storageKey: uploaded.pathname };
}
