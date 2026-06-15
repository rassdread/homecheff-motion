"use client";

import { useEffect, useMemo, useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import { useActiveTranslator } from "@/i18n/client";
import {
  audioLibraryEndpointForKind,
  findCachedMusicAsset,
  findCachedSfxAsset,
  findCachedVoiceAsset,
} from "@/lib/studio-asset-requirement-audio";
import { STUDIO_ASSET_REQUIREMENT_ENDPOINTS } from "@/lib/studio-asset-requirement-routing";
import { fetchUserAudioLibraryApi } from "@/lib/studio-audio-library-client";
import {
  requestCharacterVoicePreview,
  resolveDefaultCharacterPreviewText,
} from "@/lib/studio-character-voice-preview-client";
import { fetchUserVoiceLibrary } from "@/lib/studio-user-voice-library-client";
import { fetchVoiceLibrary } from "@/lib/studio-voice-library-client";
import type { BriefAssetRequirement } from "@/lib/studio-brief-asset-wizards";
import type { RequirementDebugEntry } from "@/lib/studio-asset-requirement-routing";

export type AudioFlowAttachPayload = {
  assetRefId: string;
  previewUrl: string;
  audioUrl: string;
  provider: string;
  cacheHit: boolean;
  source: string;
};

type Props = {
  req: BriefAssetRequirement;
  onAttach: (payload: AudioFlowAttachPayload) => void;
  onCancel: () => void;
  onDebug: (entry: RequirementDebugEntry) => void;
};

export function StudioAssetRequirementAudioFlow({ req, onAttach, onCancel, onDebug }: Props) {
  const t = useActiveTranslator();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewDuration, setPreviewDuration] = useState<number | undefined>();
  const [provider, setProvider] = useState("");
  const [cacheHit, setCacheHit] = useState(false);
  const [selectedVoiceProfile, setSelectedVoiceProfile] = useState("warm_narrator");
  const [sampleLine, setSampleLine] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        if (req.kind === "voice") {
          const [userLib, catalog] = await Promise.all([
            fetchUserVoiceLibrary().catch(() => ({ voices: [] })),
            fetchVoiceLibrary().catch(() => null),
          ]);
          const cached = findCachedVoiceAsset(userLib.voices ?? [], req.label);
          if (cached.hit && cached.previewUrl) {
            if (!cancelled) {
              setPreviewUrl(cached.previewUrl);
              setProvider(cached.provider ?? "library");
              setCacheHit(true);
            }
            onDebug({
              action: "Generate Voice (cache)",
              endpoint: STUDIO_ASSET_REQUIREMENT_ENDPOINTS.voiceLibrary,
              at: new Date().toISOString(),
              ok: true,
            });
          } else {
            const firstVoice = catalog?.catalog.voices?.[0];
            if (firstVoice?.previewUrl && !cancelled) {
              setPreviewUrl(firstVoice.previewUrl);
              setSelectedVoiceProfile(firstVoice.id);
              setProvider("elevenlabs");
              setCacheHit(true);
            }
            onDebug({
              action: "Open Voice Catalog",
              endpoint: STUDIO_ASSET_REQUIREMENT_ENDPOINTS.voiceCatalog,
              at: new Date().toISOString(),
              ok: true,
            });
          }
        } else {
          const res = await fetchUserAudioLibraryApi();
          const assets = res.ok ? (res.data.assets ?? []) : [];
          const cached =
            req.kind === "music"
              ? findCachedMusicAsset(assets, req.label)
              : findCachedSfxAsset(assets, req.label);
          if (cached.hit && cached.previewUrl && !cancelled) {
            setPreviewUrl(cached.previewUrl);
            setProvider(cached.provider ?? "library");
            setCacheHit(true);
          }
          onDebug({
            action: req.kind === "music" ? "Open Music Library" : "Open SFX Library",
            endpoint: audioLibraryEndpointForKind(req.kind === "music" ? "music" : "sfx"),
            at: new Date().toISOString(),
            ok: res.ok,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load audio library");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [req.id, req.kind, req.label, onDebug]);

  const defaultSample = useMemo(
    () => resolveDefaultCharacterPreviewText(req.label, "nl"),
    [req.label]
  );

  const handleGeneratePreview = async () => {
    setGenerating(true);
    setError("");
    const endpoint = STUDIO_ASSET_REQUIREMENT_ENDPOINTS.voicePreviewDraft;
    onDebug({
      action: "Generate Voice Preview",
      endpoint,
      at: new Date().toISOString(),
    });
    try {
      if (req.kind === "voice") {
        const result = await requestCharacterVoicePreview({
          characterId: null,
          characterName: req.label,
          voiceProfile: selectedVoiceProfile,
          language: "nl",
          sampleLine: sampleLine.trim() || defaultSample,
        });
        setPreviewUrl(result.audioUrl);
        setPreviewDuration(result.durationSeconds);
        setProvider(result.provider ?? "elevenlabs");
        setCacheHit(false);
        onDebug({
          action: "Generate Voice Preview",
          endpoint,
          at: new Date().toISOString(),
          ok: true,
        });
      } else {
        const res = await fetchUserAudioLibraryApi();
        const assets = res.ok ? (res.data.assets ?? []) : [];
        const cached =
          req.kind === "music"
            ? findCachedMusicAsset(assets, req.label)
            : findCachedSfxAsset(assets, req.label);
        if (cached.hit && cached.previewUrl) {
          setPreviewUrl(cached.previewUrl);
          setProvider(cached.provider ?? "library");
          setCacheHit(true);
        } else {
          setError(t("studio.generateMissing.audio.noLibraryMatch" as never));
          onDebug({
            action: req.kind === "music" ? "Generate Music" : "Generate SFX",
            endpoint: STUDIO_ASSET_REQUIREMENT_ENDPOINTS.audioLibrary,
            at: new Date().toISOString(),
            ok: false,
            error: "no_library_match",
          });
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Preview failed";
      setError(message);
      onDebug({
        action: "Generate Voice Preview",
        endpoint,
        at: new Date().toISOString(),
        ok: false,
        error: message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleAttach = () => {
    if (!previewUrl) {
      setError(t("studio.generateMissing.audio.previewRequired" as never));
      return;
    }
    onAttach({
      assetRefId: `${req.kind}_${Date.now()}`,
      previewUrl,
      audioUrl: previewUrl,
      provider: provider || "studio",
      cacheHit,
      source: cacheHit ? "library_cache" : "generation",
    });
    onDebug({
      action: "Attach Asset",
      endpoint: "hc://asset-references",
      at: new Date().toISOString(),
      ok: true,
    });
  };

  return (
    <div
      className="rounded-xl border border-violet-200 bg-violet-50/50 p-4"
      data-testid={`studio-asset-audio-flow-${req.kind}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900">
            {t(`studio.generateMissing.audio.title.${req.kind}` as never)}
          </h4>
          <p className="mt-1 text-xs text-zinc-600">{req.label}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600"
        >
          {t("studio.generateMissing.cancel" as never)}
        </button>
      </header>

      {loading ?
        <HomeCheffOrbitLoader state="loading" size="sm" message={t("studio.generateMissing.audio.loading" as never)} />
      : null}

      {req.kind === "voice" ?
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-zinc-700">
            {t("studio.generateMissing.audio.sampleLine" as never)}
            <textarea
              value={sampleLine}
              onChange={(e) => setSampleLine(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              placeholder={defaultSample}
            />
          </label>
        </div>
      : null}

      {previewUrl ?
        <div className="mt-3">
          <StudioAudioPreviewPlayer
            title={req.label}
            audioUrl={previewUrl}
            durationSeconds={previewDuration}
            source={
              req.kind === "voice"
                ? cacheHit
                  ? "voice_library"
                  : "voice_tts"
                : req.kind === "music"
                  ? "music_upload"
                  : "sfx_upload"
            }
            variant="compact"
          />
          {cacheHit ?
            <p className="mt-1 text-[10px] text-emerald-700">
              {t("studio.generateMissing.audio.cacheHit" as never)}
            </p>
          : null}
        </div>
      : null}

      {error ?
        <p className="mt-2 text-xs text-red-700">{error}</p>
      : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={generating}
          onClick={() => void handleGeneratePreview()}
          className="rounded-full bg-[#006D52] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {generating
            ? t("studio.generateMissing.generating" as never)
            : t("studio.generateMissing.audio.preview" as never)}
        </button>
        <button
          type="button"
          disabled={!previewUrl}
          onClick={handleAttach}
          className="rounded-full border border-[#006D52] px-3 py-1.5 text-xs font-semibold text-[#006D52] disabled:opacity-40"
        >
          {t("studio.generateMissing.audio.attach" as never)}
        </button>
      </div>
    </div>
  );
}
