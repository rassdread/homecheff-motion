import { uploadPublicBlob } from "@/lib/vercel-blob-config";

export async function uploadCharacterVoiceSample(params: {
  ownerId: string;
  characterId: string;
  sampleId: string;
  audioBuffer: Buffer;
  contentType: string;
  extension: string;
}): Promise<{ sampleUrl: string; storageKey: string }> {
  const pathname = `studio/${params.ownerId}/characters/${params.characterId}/voice-samples/${params.sampleId}.${params.extension}`;
  const uploaded = await uploadPublicBlob({
    pathname,
    body: params.audioBuffer,
    contentType: params.contentType,
    allowOverwrite: true,
    context: {
      uploadTarget: pathname,
      provider: "studio_character_voice_sample",
    },
  });
  return { sampleUrl: uploaded.url, storageKey: uploaded.pathname };
}
