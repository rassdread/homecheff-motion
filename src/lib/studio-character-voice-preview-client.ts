import { defaultCharacterVoicePreviewLine } from "@/lib/studio-character-voice";

export type CharacterVoicePreviewRequest = {
  characterId: string | null;
  characterName: string;
  voiceProfile: string;
  language: string;
  sampleLine?: string;
};

export type CharacterVoicePreviewResponse = {
  ok: true;
  audioUrl: string;
  durationSeconds?: number;
  provider?: string;
  isDraft: boolean;
};

export function resolveDefaultCharacterPreviewText(
  characterName: string,
  language: string
): string {
  const name = characterName.trim() || "Character";
  return defaultCharacterVoicePreviewLine(name, language.slice(0, 2));
}

export function characterVoicePreviewEndpoint(characterId: string | null): string {
  if (characterId) {
    return `/api/studio/characters/${encodeURIComponent(characterId)}/voice-preview`;
  }
  return "/api/studio/characters/voice-preview-draft";
}

export function buildCharacterVoicePreviewBody(
  request: CharacterVoicePreviewRequest
): Record<string, string> {
  const sampleLine = request.sampleLine?.trim();
  if (request.characterId) {
    return {
      language: request.language,
      voiceProfile: request.voiceProfile,
      characterName: request.characterName.trim(),
      ...(sampleLine ? { sampleLine } : {}),
    };
  }
  return {
    characterName: request.characterName.trim(),
    voiceProfile: request.voiceProfile,
    voiceLanguage: request.language,
    ...(sampleLine ? { sampleLine } : {}),
  };
}

export async function requestCharacterVoicePreview(
  request: CharacterVoicePreviewRequest
): Promise<CharacterVoicePreviewResponse> {
  const endpoint = characterVoicePreviewEndpoint(request.characterId);
  const res = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildCharacterVoicePreviewBody(request)),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "error" in json
        ? String((json as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  const url =
    json && typeof json === "object" && "audioUrl" in json
      ? String((json as { audioUrl: unknown }).audioUrl)
      : "";
  if (!url) {
    throw new Error("No preview URL returned.");
  }
  return {
    ok: true,
    audioUrl: url,
    durationSeconds:
      json && typeof json === "object" && "durationSeconds" in json
        ? Number((json as { durationSeconds: unknown }).durationSeconds)
        : undefined,
    provider:
      json && typeof json === "object" && "provider" in json
        ? String((json as { provider: unknown }).provider)
        : undefined,
    isDraft: !request.characterId,
  };
}
