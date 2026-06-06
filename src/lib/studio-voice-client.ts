import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type { SubtitleTrackEntry } from "@/types/studio-voice-execution";

export type StoryboardVoiceAsset = {
  id: string;
  storyboardId: string;
  language: string;
  provider: string;
  voiceProfile: string;
  voiceStyle: string;
  audioUrl: string;
  durationSeconds: number;
  status: string;
  providerVoiceId: string;
  providerModelId: string;
  errorMessage: string;
  generatedAt: string | null;
};

export type StoryboardVoiceBundleResponse = {
  voice: StoryboardVoiceAsset | null;
  subtitle: {
    id: string;
    language: string;
    status: string;
    entries: SubtitleTrackEntry[];
  } | null;
  voices: StoryboardVoiceAsset[];
};

export async function fetchStoryboardVoiceBundle(storyboardId: string) {
  return fetchSameOriginJson<StoryboardVoiceBundleResponse>(
    sameOriginApiPath(`/api/studio/storyboards/${encodeURIComponent(storyboardId)}/voice`)
  );
}

export async function generateStoryboardVoiceApi(
  storyboardId: string,
  options?: { language?: string; mock?: boolean }
) {
  return fetchSameOriginJson<{
    ok: boolean;
    voiceId: string;
    audioUrl: string;
    durationSeconds: number;
    provider: string;
    subtitleTrackId: string;
    error?: string;
    code?: string;
  }>(
    sameOriginApiPath(`/api/studio/storyboards/${encodeURIComponent(storyboardId)}/voice`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options ?? {}),
    }
  );
}

export async function updateStoryboardSubtitlesApi(
  storyboardId: string,
  entries: SubtitleTrackEntry[],
  language?: string
) {
  return fetchSameOriginJson<{
    ok: boolean;
    track?: { entries: SubtitleTrackEntry[]; srt: string };
    error?: string;
  }>(
    sameOriginApiPath(`/api/studio/storyboards/${encodeURIComponent(storyboardId)}/subtitles`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries, language }),
    }
  );
}

export async function generateStoryboardTranscriptApi(
  storyboardId: string,
  options?: { language?: string; mock?: boolean }
) {
  return fetchSameOriginJson<{
    ok: boolean;
    subtitleTrackId?: string;
    language?: string;
    lineCount?: number;
    durationSeconds?: number;
    provider?: string;
    entries?: SubtitleTrackEntry[];
    srt?: string;
    error?: string;
    code?: string;
  }>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/subtitles/transcribe`
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options ?? {}),
    }
  );
}

export async function uploadStoryboardExternalAudioApi(
  storyboardId: string,
  file: File,
  options?: { language?: string; displayName?: string }
) {
  const form = new FormData();
  form.append("audio", file);
  if (options?.language) {
    form.append("language", options.language);
  }
  if (options?.displayName) {
    form.append("displayName", options.displayName);
  }
  return fetchSameOriginJson<{
    ok: boolean;
    voiceId?: string;
    audioUrl?: string;
    durationSeconds?: number;
    displayName?: string;
    language?: string;
    error?: string;
    code?: string;
  }>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/audio-upload`
    ),
    {
      method: "POST",
      body: form,
    }
  );
}

export async function linkCharacterVoiceReferenceApi(
  characterId: string,
  params: { audioUrl: string; language?: string; label?: string }
) {
  return fetchSameOriginJson<{
    ok: boolean;
    characterId?: string;
    language?: string;
    referenceAudioUrl?: string;
    character?: import("@/types/studio-api").StudioCharacterListItem;
    error?: string;
    code?: string;
  }>(
    sameOriginApiPath(
      `/api/studio/characters/${encodeURIComponent(characterId)}/voice-reference`
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }
  );
}
