import type { MotionStudioAudioExportJson } from "@/types/motion-voice-export";

export async function patchProjectAudioExportSettings(
  projectId: string,
  patch: Partial<
    Pick<MotionStudioAudioExportJson, "voiceEnabled" | "subtitlesEnabled" | "subtitleMode">
  >
): Promise<{ ok: boolean; audioExport?: MotionStudioAudioExportJson; error?: string }> {
  const res = await fetch(`/api/instant-premium/projects/${encodeURIComponent(projectId)}/audio-export`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error =
      json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : `HTTP ${res.status}`;
    return { ok: false, error };
  }
  const audioExport =
    json && typeof json === "object" && "audioExport" in json
      ? (json as { audioExport: MotionStudioAudioExportJson }).audioExport
      : undefined;
  return { ok: true, audioExport };
}
