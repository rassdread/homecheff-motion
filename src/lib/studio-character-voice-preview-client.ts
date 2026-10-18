import { defaultCharacterVoicePreviewLine } from "@/lib/studio-character-voice";
import { VOICE_PREVIEW_CONFIRMATION_CODE } from "@/lib/studio-voice-preview-charge";
export class CharacterVoicePreviewError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "CharacterVoicePreviewError";
    this.code = code;
  }
}

export type CharacterVoicePreviewRequest = {
  characterId: string | null;
  characterName: string;
  voiceProfile: string;
  language: string;
  sampleLine?: string;
  previewType?: string;
  speechSpeed?: number;
};

export type CharacterVoicePreviewResponse = {
  ok: true;
  audioUrl: string;
  durationSeconds?: number;
  provider?: string;
  isDraft: boolean;
  free: boolean;
  cached: boolean;
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
  const previewType = request.previewType?.trim();
  if (request.characterId) {
    return {
      language: request.language,
      voiceProfile: request.voiceProfile,
      characterName: request.characterName.trim(),
      ...(sampleLine ? { sampleLine } : {}),
      ...(previewType ? { previewType } : {}),
    };
  }
  return {
    characterName: request.characterName.trim(),
    voiceProfile: request.voiceProfile,
    voiceLanguage: request.language,
    ...(sampleLine ? { sampleLine } : {}),
    ...(previewType ? { previewType } : {}),
  };
}

const previewInFlight = new Set<string>();

function previewPayload(request: CharacterVoicePreviewRequest, confirmCharge: boolean) {
  return {
    ...buildCharacterVoicePreviewBody(request),
    ...(request.speechSpeed != null ? { speechSpeed: request.speechSpeed } : {}),
    ...(confirmCharge ? { confirmCharge: true } : {}),
  };
}

function previewLockKey(request: CharacterVoicePreviewRequest): string {
  return `${characterVoicePreviewEndpoint(request.characterId)}:${JSON.stringify(previewPayload(request, false))}`;
}

async function confirmUncachedPreview(json: unknown): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const body = json && typeof json === "object" ? (json as { credits?: unknown; studioHcAvailable?: unknown }) : {};
  const credits = typeof body.credits === "number" ? body.credits : 15;
  const available =
    typeof body.studioHcAvailable === "number"
      ? `${body.studioHcAvailable.toLocaleString("nl-NL")} Studio HC`
      : "onbekend";
  return window.confirm(
    `Dit voorbeeld is nog niet opgeslagen.\nKosten: ${credits} Studio HC\nBeschikbaar: ${available}\n\nBevestig om dit bedrag te gebruiken.`
  );
}

async function postPreview(
  request: CharacterVoicePreviewRequest,
  confirmCharge: boolean
): Promise<{ response: Response; json: unknown }> {
  const response = await fetch(characterVoicePreviewEndpoint(request.characterId), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(previewPayload(request, confirmCharge)),
  });
  const json: unknown = await response.json().catch(() => null);
  return { response, json };
}

export async function requestCharacterVoicePreview(
  request: CharacterVoicePreviewRequest
): Promise<CharacterVoicePreviewResponse> {
  const lockKey = previewLockKey(request);
  if (previewInFlight.has(lockKey)) {
    throw new CharacterVoicePreviewError("Er loopt al een voorbeeld.", "PREVIEW_IN_FLIGHT");
  }
  previewInFlight.add(lockKey);
  try {
    let { response, json } = await postPreview(request, false);
    const code =
      json && typeof json === "object" && "code" in json ? String((json as { code: unknown }).code) : "";
    if (response.status === 402 && code === VOICE_PREVIEW_CONFIRMATION_CODE) {
      const accepted = await confirmUncachedPreview(json);
      if (!accepted) {
        throw new CharacterVoicePreviewError("Voorbeeld geannuleerd.", "PREVIEW_NOT_CONFIRMED");
      }
      ({ response, json } = await postPreview(request, true));
    }
    if (!response.ok) {
      const body = json && typeof json === "object" ? (json as { error?: unknown; code?: unknown }) : {};
      const msg = body.error ? String(body.error) : `HTTP ${response.status}`;
      throw new CharacterVoicePreviewError(msg, body.code ? String(body.code) : undefined);
    }
    const url =
      json && typeof json === "object" && "audioUrl" in json
        ? String((json as { audioUrl: unknown }).audioUrl)
        : "";
    if (!url) {
      throw new Error("No preview URL returned.");
    }
    const free = Boolean(json && typeof json === "object" && (json as { free?: unknown }).free === true);
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
      free,
      cached: free,
    };
  } finally {
    previewInFlight.delete(lockKey);
  }
}
