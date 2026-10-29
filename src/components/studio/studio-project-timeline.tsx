"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { duckedLinearGain, MUSIC_UNDER_VOICE_GAIN } from "@/lib/studio-audio-ducking";
import { classifyFilmVideoFile, filmVideoDurationAllowed } from "@/lib/studio-film-media";
import { advancePlayhead, clampPlayhead, COMMON_SUBTITLE_LANGUAGES, cueAt, msFromPixels, searchLanguages, shouldResyncMedia } from "@/lib/studio-timeline";
import { clipDraftPatch, draftFromClip, type ClipDraft } from "@/lib/studio-timeline-clip-draft";

type Cue = { id?: string; text: string; startMs: number; endMs: number; sceneId?: string };
type Clip = {
  id: string;
  startMs: number;
  durationMs: number;
  inMs: number;
  outMs: number | null;
  sourceKind: string;
  sourceId: string;
  text: string;
  volume: number;
  muted: boolean;
  playbackUrl: string | null;
  stillUrl: string | null;
  mediaKind: string;
  audible: boolean;
};
type Track = { id: string; type: string; sortOrder: number; muted: boolean; volume: number; language: string; clips: Clip[] };
type Scene = {
  id: string;
  order: number;
  title: string;
  durationMs: number;
  imageUrl: string | null;
  dialogue: { preparedText: string | null; audioStatus: string; speakerStatus: string };
  characterCount: number;
};
type Timeline = {
  id: string;
  revision: number;
  simpleMode: boolean;
  previewLanguage: string;
  filmEndMs: number;
  title: string;
  storyboardId: string | null;
  scenes: Scene[];
  narration: { script: string; audioStatus: string };
  tracks: Track[];
  subtitles: Array<{ trackId: string; language: string; status: string; previewEnabled: boolean; cues: Cue[] }>;
};

const TRACK_ORDER = ["VIDEO", "DIALOGUE", "NARRATION", "MUSIC", "SFX", "SUBTITLE"];

type AudioItem = { id: string; title: string };

export function StudioProjectTimeline({
  projectId,
  music,
  soundEffects,
}: {
  projectId: string;
  music: AudioItem[];
  soundEffects: AudioItem[];
}) {
  const t = useActiveTranslator();
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [pixelsPerSecond, setPixelsPerSecond] = useState(80);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState("");
  const [languageQuery, setLanguageQuery] = useState("");
  const [customLanguage, setCustomLanguage] = useState("");
  const [editingLanguage, setEditingLanguage] = useState("");
  const [draftCues, setDraftCues] = useState<Cue[]>([]);
  const [undoPatch, setUndoPatch] = useState<{ clipId: string; patch: Record<string, unknown>; revision: number } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState("");
  const [exportStage, setExportStage] = useState("preparing");
  const [readyJobId, setReadyJobId] = useState("");
  const exportAbort = useRef<AbortController | null>(null);
  const [exportJobId, setExportJobId] = useState("");
  const resumeKey = useRef("");
  const [uploadNote, setUploadNote] = useState("");
  const playRef = useRef<number | null>(null);
  const playheadRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioProbeRef = useRef<HTMLSpanElement | null>(null);
  const audioMap = useRef<Map<string, HTMLAudioElement>>(new Map());
  playheadRef.current = playhead;

  async function load() {
    const response = await fetch(`/api/studio/projects/${projectId}/timeline`);
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? t("studio.workspace.v15.saveFailed"));
      return;
    }
    setMissing(body.timeline == null);
    setTimeline(body.timeline);
    setError("");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
    // The project id is the only input. Reload stays explicit after edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!playing || !timeline) return;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      const step = advancePlayhead(playheadRef.current, delta, timeline.filmEndMs);
      playheadRef.current = step.next;
      setPlayhead(step.next);
      if (step.ended) {
        setPlaying(false);
        return;
      }
      playRef.current = requestAnimationFrame(tick);
    };
    playRef.current = requestAnimationFrame(tick);
    return () => {
      if (playRef.current) cancelAnimationFrame(playRef.current);
    };
  }, [playing, timeline]);

  const selected = useMemo(() => {
    for (const track of timeline?.tracks ?? []) {
      const clip = track.clips.find((item) => item.id === selectedClipId);
      if (clip) return { track, clip };
    }
    return null;
  }, [timeline, selectedClipId]);

  const previewCues = timeline?.subtitles.find((track) => track.language === timeline.previewLanguage)?.cues ?? [];
  const visibleCue = cueAt(previewCues, Math.round(playhead));
  const currentVideo = timeline?.tracks
    .filter((track) => track.type === "VIDEO")
    .flatMap((track) => track.clips)
    .find((clip) => playhead >= clip.startMs && playhead < clip.startMs + clip.durationMs);
  const audibleClips = useMemo(() => {
    if (!timeline) return [];
    return timeline.tracks.flatMap((track) => track.clips.filter((clip) => clip.audible).map((clip) => ({ track, clip })));
  }, [timeline]);

  useEffect(() => {
    const map = audioMap.current;
    const ids = new Set(audibleClips.map((item) => item.clip.id));
    for (const item of audibleClips) {
      let audio = map.get(item.clip.id);
      if (!audio) {
        audio = new Audio();
        audio.preload = "auto";
        map.set(item.clip.id, audio);
      }
      if (item.clip.playbackUrl && audio.src !== item.clip.playbackUrl) audio.src = item.clip.playbackUrl;
    }
    for (const [id, audio] of map) {
      if (!ids.has(id)) {
        audio.pause();
        map.delete(id);
      }
    }
  }, [audibleClips]);

  useEffect(() => {
    const map = audioMap.current;
    const video = videoRef.current;
    return () => {
      for (const audio of map.values()) audio.pause();
      map.clear();
      video?.pause();
    };
  }, []);

  useEffect(() => {
    const musicBed = audibleClips
      .filter((item) => item.track.type === "MUSIC")
      .sort((a, b) => a.clip.startMs - b.clip.startMs || a.clip.durationMs - b.clip.durationMs)[0];
    const envelopes = audibleClips
      .filter((item) => item.track.type === "DIALOGUE" || item.track.type === "NARRATION")
      .map((item) => ({
        startSeconds: item.clip.startMs / 1000,
        endSeconds: (item.clip.startMs + item.clip.durationMs) / 1000,
        musicGain: MUSIC_UNDER_VOICE_GAIN,
        ambienceGain: 1,
        attackSeconds: 0.05,
        releaseSeconds: 0.2,
      }));
    for (const item of audibleClips) {
      const audio = audioMap.current.get(item.clip.id);
      if (!audio || !item.clip.playbackUrl) continue;
      const active = playing && playhead >= item.clip.startMs && playhead < item.clip.startMs + item.clip.durationMs;
      const base = (item.clip.volume / 100) * (item.track.volume / 100);
      const duck = musicBed && item.clip.id === musicBed.clip.id
        ? duckedLinearGain({ baseVolume: 1, envelopes, gainKey: "musicGain", timeSeconds: playhead / 1000 })
        : 1;
      audio.volume = Math.max(0, Math.min(1, base * duck));
      if (!active) {
        audio.pause();
        continue;
      }
      const offset = (playhead - item.clip.startMs + item.clip.inMs) / 1000;
      if (shouldResyncMedia({
        currentTime: audio.currentTime,
        targetTime: offset,
        seeking: audio.seeking,
        readyState: audio.readyState,
        thresholdSeconds: 0.35,
      })) audio.currentTime = Math.max(0, offset);
      if (audio.paused && !audio.seeking) void audio.play().catch(() => undefined);
    }
      if (audioProbeRef.current) {
      const activeAudio = audibleClips
        .map((item) => ({ item, audio: audioMap.current.get(item.clip.id) }))
        .find(({ item, audio }) => audio && playing && playhead >= item.clip.startMs && playhead < item.clip.startMs + item.clip.durationMs);
      audioProbeRef.current.dataset.mixSrc = activeAudio?.audio?.currentSrc || activeAudio?.audio?.src || "";
      audioProbeRef.current.dataset.mixMuted = activeAudio?.audio?.muted ? "1" : "0";
      audioProbeRef.current.dataset.mixVolume = String(activeAudio?.audio?.volume ?? 0);
      audioProbeRef.current.dataset.mixPaused = activeAudio?.audio?.paused === false ? "0" : "1";
      audioProbeRef.current.dataset.mixTime = String(
        activeAudio?.audio && Number.isFinite(activeAudio.audio.currentTime) ? Math.round(activeAudio.audio.currentTime * 1000) : -1,
      );
      audioProbeRef.current.dataset.markers = audibleClips.map((item) => {
        const audio = audioMap.current.get(item.clip.id);
        const active = playing && playhead >= item.clip.startMs && playhead < item.clip.startMs + item.clip.durationMs;
        const position = audio && Number.isFinite(audio.currentTime) ? Math.round(audio.currentTime * 1000) : -1;
        return `${item.track.type}:${active ? "on" : "off"}:${position}:${audio?.muted ? "muted" : "open"}:${Math.round((audio?.volume ?? 0) * 100)}:${audio?.readyState ?? -1}:${audio?.seeking ? 1 : 0}:${audio?.paused === false ? 0 : 1}`;
      }).join("|");
    }
    const video = videoRef.current;
    if (!video) return;
    if (currentVideo?.playbackUrl) {
      const offset = Math.max(0, (playhead - currentVideo.startMs + currentVideo.inMs) / 1000);
      if (shouldResyncMedia({
        currentTime: video.currentTime,
        targetTime: offset,
        seeking: video.seeking,
        readyState: video.readyState,
        thresholdSeconds: 0.08,
      })) {
        try {
          video.currentTime = offset;
        } catch {
          // The media element is not seekable until metadata arrives.
        }
      }
      video.dataset.mediaMs = String(Math.round((Number.isFinite(video.currentTime) ? video.currentTime : 0) * 1000));
    }
    if (!playing || !currentVideo?.playbackUrl) {
      video.pause();
      return;
    }
    if (video.paused && !video.seeking) void video.play().catch(() => undefined);
  }, [playing, playhead, audibleClips, currentVideo]);

  async function send(payload: Record<string, unknown>) {
    const response = await fetch(`/api/studio/projects/${projectId}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) {
      if (body.code === "confirmation_required" && payload.confirmDuplicate !== true && window.confirm(t("studio.workspace.v15.duplicateConfirm"))) {
        return send({ ...payload, confirmDuplicate: true });
      }
      setError(body.code === "conflict" ? t("studio.workspace.v15.conflict") : body.error ?? t("studio.workspace.v15.saveFailed"));
      return null;
    }
    setTimeline(body.timeline);
    setMissing(false);
    setError("");
    return body.timeline as Timeline;
  }

  async function uploadVideo(file: File) {
    const verdict = classifyFilmVideoFile(file);
    if (verdict !== "ok") {
      setUploadNote(verdict === "size" ? t("studio.workspace.v16.videoTooLarge") : t("studio.workspace.v16.videoType"));
      return;
    }
    const duration = await readVideoDuration(file);
    if (!filmVideoDurationAllowed(duration)) {
      setUploadNote(t("studio.workspace.v16.videoTooLong"));
      return;
    }
    const form = new FormData();
    form.set("file", file);
    form.set("kind", "video");
    form.set("projectId", projectId);
    const response = await fetch("/api/studio/orchestrator/upload-asset", { method: "POST", body: form });
    const body = await response.json().catch(() => null);
    const url = typeof body?.asset?.url === "string" ? body.asset.url : "";
    if (!response.ok || !url || !timeline) {
      setUploadNote(body?.error ?? t("studio.workspace.v15.saveFailed"));
      return;
    }
    const videoTrack = timeline.tracks.find((track) => track.type === "VIDEO");
    if (!videoTrack) return;
    const placed = await send({
      action: "add-clip",
      revision: timeline.revision,
      trackId: videoTrack.id,
      sourceKind: "uploaded_video",
      sourceId: url,
      startMs: timeline.filmEndMs,
      durationMs: Math.round(duration * 1000),
    });
    if (!placed) return;
    setUploadNote(t("studio.workspace.v16.videoAdded"));
  }

  async function uploadImage(file: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setUploadNote(t("studio.workspace.v15.saveFailed"));
      return;
    }
    const stored = await storeUpload(file, "photo");
    if (!stored?.url || !timeline) return;
    const videoTrack = timeline.tracks.find((track) => track.type === "VIDEO");
    if (!videoTrack) return;
    const placed = await send({
      action: "add-clip",
      revision: timeline.revision,
      trackId: videoTrack.id,
      sourceKind: "uploaded_image",
      sourceId: stored.url,
      startMs: timeline.filmEndMs,
      durationMs: 8000,
    });
    if (!placed) return;
    setUploadNote(t("studio.workspace.v16.imageAdded"));
  }

  async function uploadSpeech(file: File) {
    const duration = await readMediaDuration(file, "audio");
    const stored = await storeUpload(file, "voice", duration);
    if (!stored?.libraryAssetId || !timeline) return;
    const track = timeline.tracks.find((item) => item.type === "DIALOGUE");
    if (!track) return;
    const placed = await send({
      action: "add-clip",
      revision: timeline.revision,
      trackId: track.id,
      sourceKind: "library_asset",
      sourceId: stored.libraryAssetId,
      startMs: 500,
      durationMs: Math.max(1000, Math.round(duration * 1000)),
    });
    if (!placed) return;
    setUploadNote(t("studio.workspace.v16.voiceAdded"));
  }

  async function uploadTimelineAudio(file: File, kind: "music" | "sfx") {
    const duration = await readMediaDuration(file, "audio");
    const form = new FormData();
    form.set("audio", file);
    form.set("kind", kind);
    form.set("name", file.name);
    const response = await fetch("/api/studio/audio-library/upload", { method: "POST", body: form });
    const body = await response.json().catch(() => null);
    const id = typeof body?.asset?.id === "string" ? body.asset.id : "";
    if (!response.ok || !id || !timeline) {
      setUploadNote(body?.error ?? t("studio.workspace.v15.saveFailed"));
      return;
    }
    const track = timeline.tracks.find((item) => item.type === (kind === "music" ? "MUSIC" : "SFX"));
    if (!track) return;
    const placed = await send({
      action: "add-clip",
      revision: timeline.revision,
      trackId: track.id,
      sourceKind: "user_audio",
      sourceId: id,
      startMs: kind === "music" ? 2000 : timeline.filmEndMs / 2,
      durationMs: Math.max(1000, Math.round(duration * 1000)),
    });
    if (!placed) return;
    setUploadNote(t("studio.workspace.v16.audioAdded"));
  }

  async function storeUpload(file: File, kind: string, durationSeconds?: number) {
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    form.set("projectId", projectId);
    if (durationSeconds && durationSeconds > 0) form.set("durationSeconds", String(durationSeconds));
    const response = await fetch("/api/studio/orchestrator/upload-asset", { method: "POST", body: form });
    const body = await response.json().catch(() => null);
    const url = typeof body?.asset?.url === "string" ? body.asset.url : "";
    if (!response.ok || !url) {
      setUploadNote(body?.error ?? t("studio.workspace.v15.saveFailed"));
      return null;
    }
    return {
      url,
      storageKey: typeof body?.asset?.storageKey === "string" ? body.asset.storageKey : "",
      libraryAssetId: typeof body?.libraryAssetId === "string" ? body.libraryAssetId : "",
    };
  }

  function stageNote(stage: string): string {
    if (stage === "rendering_scenes") return t("studio.workspace.v278.exportRendering");
    if (stage === "processing_audio") return t("studio.workspace.v278.exportAudio");
    if (stage === "finalizing") return t("studio.workspace.v278.exportFinalizing");
    if (stage === "saving") return t("studio.workspace.v278.exportSaving");
    if (stage === "completed") return t("studio.workspace.v16.exportSaved");
    if (stage === "cancelled") return t("studio.workspace.v16.exportCancelled");
    if (stage === "failed") return t("studio.workspace.v16.exportFailed");
    return t("studio.workspace.v278.exportPreparing");
  }

  async function downloadExport(jobId: string) {
    const response = await fetch(`/api/studio/projects/${projectId}/timeline/render?jobId=${encodeURIComponent(jobId)}&download=1`);
    if (!response.ok) {
      setError(t("studio.workspace.v16.exportFailed"));
      return;
    }
    const blob = await response.blob();
    if (blob.size < 32 || blob.type.includes("json")) {
      setError(t("studio.workspace.v16.exportFailed"));
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${timeline?.title || "film"}.mp4`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setReadyJobId(jobId);
    setExportNote(t("studio.workspace.v16.exportSaved"));
    setExportStage("completed");
  }

  async function watchExport(jobId: string, autoDownload: boolean) {
    const controller = new AbortController();
    exportAbort.current = controller;
    const deadline = Date.now() + 20 * 60 * 1000;
    while (!controller.signal.aborted && Date.now() < deadline) {
      let body: { status?: string; stage?: string; code?: string } | null = null;
      try {
        const response = await fetch(`/api/studio/projects/${projectId}/timeline/render?jobId=${encodeURIComponent(jobId)}`, {
          signal: controller.signal,
        });
        body = (await response.json().catch(() => null)) as { status?: string; stage?: string; code?: string } | null;
        if (!response.ok || !body?.status) {
          setError(t("studio.workspace.v16.exportFailed"));
          setExportNote("");
          break;
        }
      } catch {
        if (controller.signal.aborted) break;
        setError(t("studio.workspace.v16.exportFailed"));
        setExportNote("");
        break;
      }
      const stage = body.stage || "preparing";
      setExportStage(stage);
      setExportNote(stageNote(stage));
      if (body.status === "succeeded") {
        setReadyJobId(jobId);
        setExportNote(t("studio.workspace.v16.exportSaved"));
        setExportStage("completed");
        if (autoDownload) await downloadExport(jobId);
        break;
      }
      if (body.status === "cancelled" || body.code === "cancelled") {
        setExportNote(t("studio.workspace.v16.exportCancelled"));
        setError("");
        setExportJobId("");
        break;
      }
      if (body.status === "failed") {
        setError(t("studio.workspace.v16.exportFailed"));
        setExportNote("");
        setExportJobId("");
        break;
      }
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, 1500);
        controller.signal.addEventListener("abort", () => {
          window.clearTimeout(timer);
          resolve();
        }, { once: true });
      });
    }
    setExporting(false);
  }

  async function exportFilm() {
    if (!timeline) return;
    setExporting(true);
    setReadyJobId("");
    setExportStage("preparing");
    setExportNote(t("studio.workspace.v278.exportPreparing"));
    setError("");
    const started = await fetch(`/api/studio/projects/${projectId}/timeline/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: "start" }),
    });
    const startedBody = (await started.json().catch(() => null)) as { jobId?: string } | null;
    if (!started.ok || !startedBody?.jobId) {
      setError(t("studio.workspace.v16.exportFailed"));
      setExportNote("");
      setExportJobId("");
      setExporting(false);
      return;
    }
    setExportJobId(startedBody.jobId);
    const controller = new AbortController();
    exportAbort.current = controller;
    let response: Response;
    try {
      response = await fetch(`/api/studio/projects/${projectId}/timeline/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          phase: "render",
          jobId: startedBody.jobId,
          revision: timeline.revision,
          burnLanguage: timeline.previewLanguage,
          width: 720,
          height: 1280,
        }),
      });
    } catch {
      setExportNote(t("studio.workspace.v16.exportCancelled"));
      setError("");
      setExportJobId("");
      setExporting(false);
      return;
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (response.ok && contentType.includes("video")) {
      const libraryHeader = response.headers.get("X-Studio-Library-Asset") ?? "";
      const blob = await response.blob();
      if (blob.size < 32) {
        setError(t("studio.workspace.v16.exportFailed"));
        setExportNote("");
        setExportJobId("");
        setExporting(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${timeline.title || "film"}.mp4`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setExportNote(
        libraryHeader && libraryHeader !== "unavailable"
          ? t("studio.workspace.v16.exportSaved")
          : t("studio.workspace.v16.exportFileOnly"),
      );
      setExportStage("completed");
      setExportJobId("");
      setExporting(false);
      return;
    }
    const body = (await response.json().catch(() => null)) as { code?: string; status?: string; jobId?: string } | null;
    if (response.status === 202 || body?.status === "queued" || body?.status === "processing" || body?.status === "succeeded") {
      await watchExport(body?.jobId || startedBody.jobId, true);
      return;
    }
    if (body?.code === "cancelled") {
      setExportNote(t("studio.workspace.v16.exportCancelled"));
      setError("");
    } else {
      setError(t("studio.workspace.v16.exportFailed"));
      setExportNote("");
    }
    setExportJobId("");
    setExporting(false);
  }

  useEffect(() => {
    const timelineId = timeline?.id ?? "";
    if (!timelineId || resumeKey.current === timelineId) return;
    resumeKey.current = timelineId;
    const timer = window.setTimeout(() => {
      void (async () => {
        const response = await fetch(`/api/studio/projects/${projectId}/timeline/render`);
        const body = (await response.json().catch(() => null)) as { jobId?: string; status?: string; stage?: string } | null;
        if (!body?.jobId) return;
        if (body.status === "succeeded") {
          setReadyJobId(body.jobId);
          setExportStage("completed");
          setExportNote(t("studio.workspace.v278.exportReady"));
          return;
        }
        if (body.status === "queued" || body.status === "processing") {
          setExporting(true);
          setExportJobId(body.jobId);
          setExportStage(body.stage || "preparing");
          setExportNote(stageNote(body.stage || "preparing"));
          await watchExport(body.jobId, false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
    // Resume once per timeline. The watcher closes over the current project.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, timeline?.id]);

  async function cancelExport() {
    const jobId = exportJobId;
    if (!jobId) return;
    await fetch(`/api/studio/projects/${projectId}/timeline/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: "cancel", jobId }),
    }).catch(() => null);
    exportAbort.current?.abort();
    setExportNote(t("studio.workspace.v16.exportCancelled"));
    setError("");
    setExportJobId("");
      setExporting(false);
  }

  function chooseLanguage(language: string) {
    setEditingLanguage(language);
    setDraftCues(timeline?.subtitles.find((track) => track.language === language)?.cues ?? []);
  }

  const width = Math.max(640, ((timeline?.filmEndMs ?? 10000) / 1000) * pixelsPerSecond + 160);
  const languages = searchLanguages(languageQuery);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-zinc-700">{t("studio.workspace.v15.intro")}</p>
        {missing ? (
          <button type="button" className="min-h-11 rounded-full bg-[#006D52] px-4 text-sm font-semibold text-white" onClick={() => void send({ action: "create" })}>
            {t("studio.workspace.v15.create")}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      {exportNote ? <p className="text-sm text-slate-800" role="status" data-testid="film-export-status" data-stage={exportStage}>{exportNote}</p> : null}
      {!timeline ? null : (
        <>
          <div className="sticky top-[var(--studio-header-height)] z-10 flex flex-wrap gap-2 border-b border-zinc-200 bg-white/95 py-2">
            <button type="button" data-testid="film-timeline-play" className="min-h-11 rounded-full bg-[#0067B1] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#041428]" onClick={() => setPlaying((value) => !value)}>
              {playing ? t("studio.workspace.v15.pause") : t("studio.workspace.v15.play")}
            </button>
            <button type="button" className="min-h-11 rounded-full border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900" onClick={() => setPixelsPerSecond((value) => Math.min(200, value + 20))}>{t("studio.workspace.v15.zoomIn")}</button>
            <button type="button" className="min-h-11 rounded-full border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900" onClick={() => setPixelsPerSecond((value) => Math.max(40, value - 20))}>{t("studio.workspace.v15.zoomOut")}</button>
            <button type="button" className="min-h-11 rounded-full border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 disabled:opacity-40" disabled={!undoPatch} onClick={() => undoPatch && void send({ action: "update-clip", revision: timeline.revision, clipId: undoPatch.clipId, patch: undoPatch.patch }).then(() => setUndoPatch(null))}>
              {t("studio.workspace.v15.undo")}
            </button>
            <button type="button" data-testid="film-export-mp4" className="min-h-11 rounded-full bg-[#006D52] px-4 text-sm font-semibold text-white hover:bg-[#005a44] disabled:opacity-40" disabled={exporting} onClick={() => void exportFilm()}>
              {exporting ? t("studio.workspace.v16.exporting") : t("studio.workspace.v16.export")}
            </button>
            {exporting && exportJobId ? (
              <button type="button" data-testid="film-export-cancel" data-job-id={exportJobId} className="min-h-11 rounded-full border border-red-300 bg-white px-4 text-sm font-semibold text-red-700" aria-label={t("studio.workspace.v16.exportCancel")} onClick={() => void cancelExport()}>
                {t("studio.workspace.v16.exportCancel")}
              </button>
            ) : null}
            {readyJobId && !exporting ? (
              <button type="button" data-testid="film-export-download" data-job-id={readyJobId} className="min-h-11 rounded-full border border-[#006D52] bg-white px-4 text-sm font-semibold text-[#006D52]" onClick={() => void downloadExport(readyJobId)}>
                {t("studio.workspace.v278.exportReady")}
              </button>
            ) : null}
            <details className="relative">
              <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-full border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900">{t("studio.workspace.v22.addMedia")}</summary>
              <div className="absolute left-0 z-20 mt-1 flex w-56 flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
                <FileButton label={t("studio.workspace.v16.uploadImage")} accept="image/png,image/jpeg,image/webp" onFile={(file) => void uploadImage(file)} />
                <FileButton label={t("studio.workspace.v16.uploadVideo")} accept="video/mp4,video/quicktime,video/webm,video/x-m4v" onFile={(file) => void uploadVideo(file)} />
                <FileButton label={t("studio.workspace.v16.uploadVoice")} accept="audio/wav,audio/mpeg,audio/mp3,.wav,.mp3" onFile={(file) => void uploadSpeech(file)} />
                <FileButton label={t("studio.workspace.v16.uploadMusic")} accept="audio/wav,audio/mpeg,audio/mp3,.wav,.mp3" onFile={(file) => void uploadTimelineAudio(file, "music")} />
                <FileButton label={t("studio.workspace.v16.uploadSfx")} accept="audio/wav,audio/mpeg,audio/mp3,.wav,.mp3" onFile={(file) => void uploadTimelineAudio(file, "sfx")} />
              </div>
            </details>
            <button type="button" data-testid="film-timeline-mode" className="min-h-11 rounded-full border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900" onClick={() => void send({ action: "mode", revision: timeline.revision, simpleMode: !timeline.simpleMode })}>
              {timeline.simpleMode ? t("studio.workspace.v15.advanced") : t("studio.workspace.v15.simple")}
            </button>
            <span className="self-center text-xs text-zinc-500" data-testid="film-timeline-clock" data-ms={Math.round(playhead)}>{formatClock(playhead)} / {formatClock(timeline.filmEndMs)}</span>
            <span ref={audioProbeRef} data-testid="film-timeline-audio" className="sr-only" />
            <label className="flex items-center gap-2 text-xs text-zinc-600">
              {t("studio.workspace.v223l.seek")}
              <input data-testid="film-timeline-seek" className="min-h-11 w-28 rounded border px-2 text-sm text-zinc-900" type="number" min={0} max={timeline.filmEndMs} step={100} value={Math.round(playhead)} onChange={(event) => { setPlaying(false); setPlayhead(clampPlayhead(Number(event.target.value), timeline.filmEndMs)); }} />
            </label>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-[#041428]">
            {currentVideo?.playbackUrl ? (
              <video ref={videoRef} data-testid="film-timeline-video" src={currentVideo.playbackUrl} className="mx-auto max-h-[50vh] w-auto max-w-full bg-black object-contain" muted playsInline onError={() => setError(t("studio.workspace.v15.mediaFailed"))} />
            ) : currentVideo?.stillUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentVideo.stillUrl} alt="" className="max-h-80 w-full object-contain" />
            ) : (
              <div className="flex min-h-40 items-center justify-center text-sm text-white/70">{t("studio.workspace.v15.emptyPreview")}</div>
            )}
            {visibleCue ? (
              <p data-testid="film-timeline-cue" className="pointer-events-none absolute inset-x-4 bottom-4 mx-auto max-w-xl rounded bg-black/75 px-3 py-2 text-center text-sm leading-5 text-white">
                {visibleCue.text}
              </p>
            ) : null}
          </div>
          <label className="block text-sm">
            {t("studio.workspace.v15.previewLanguage")}
            <select data-testid="film-subtitle-preview-language" className="mt-1 min-h-11 w-full rounded-lg border px-2" value={timeline.previewLanguage} onChange={(event) => void send({ action: "preview-language", revision: timeline.revision, language: event.target.value })}>
              <option value="">{t("studio.workspace.v15.previewOff")}</option>
              {timeline.subtitles.filter((track) => track.previewEnabled).map((track) => (
                <option key={track.language} value={track.language}>{languageLabel(track.language)}</option>
              ))}
            </select>
          </label>

          {uploadNote ? <p className="text-sm text-zinc-700">{uploadNote}</p> : null}
          {timeline.simpleMode ? (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-800">
              <li>{t("studio.workspace.v16.stepScenes")}</li>
              <li>{t("studio.workspace.v16.stepCharacters")}</li>
              <li>{t("studio.workspace.v16.stepMedia")}</li>
              <li>{t("studio.workspace.v16.stepSound")}</li>
              <li>{t("studio.workspace.v16.stepSubtitles")}</li>
              <li>{t("studio.workspace.v16.stepPreview")}</li>
              <li>{t("studio.workspace.v16.stepExport")}</li>
            </ol>
          ) : null}
          <p className="text-xs text-zinc-500">{t("studio.workspace.v16.mixNote")}</p>

          <div className={timeline.simpleMode ? "hidden" : "flex min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#041428] text-white"}>
            <div className="w-28 shrink-0 border-r border-white/10 bg-[#041428]">
              <div className="h-8 border-b border-white/10" />
              {TRACK_ORDER.flatMap((type) => timeline.tracks.filter((track) => track.type === type)).map((track) => (
                <div key={track.id} className="flex h-16 flex-col justify-center gap-1 border-b border-white/10 px-2 text-xs">
                  <span className="truncate font-semibold text-white">{track.language ? languageLabel(track.language) : trackName(track.type, t)}</span>
                  {track.type !== "SUBTITLE" ? (
                    <button type="button" className="min-h-8 text-left text-emerald-200" onClick={() => void send({ action: "track", revision: timeline.revision, trackId: track.id, muted: !track.muted })}>
                      {track.muted ? t("studio.workspace.v15.unmute") : t("studio.workspace.v15.mute")}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div style={{ width }} className="relative">
                <div className="relative h-8 border-b border-white/10 text-xs text-white/70">
                  {Array.from({ length: Math.ceil(width / pixelsPerSecond) }, (_, index) => (
                    <span key={index} className="absolute top-1" style={{ left: index * pixelsPerSecond }}>{index}s</span>
                  ))}
                  <div className="absolute top-0 h-full w-0.5 bg-[#006D52]" style={{ left: (playhead / 1000) * pixelsPerSecond }} />
                </div>
                {TRACK_ORDER.flatMap((type) => timeline.tracks.filter((track) => track.type === type)).map((track) => (
                  <div
                    key={track.id}
                    className="relative h-16 border-b border-white/10 bg-white/5"
                    onClick={(event) => {
                      const bounds = event.currentTarget.getBoundingClientRect();
                      setPlayhead(msFromPixels(event.clientX - bounds.left, pixelsPerSecond));
                      setPlaying(false);
                    }}
                  >
                    {track.clips.map((clip) => (
                      <button
                        key={clip.id}
                        type="button"
                        className={`absolute top-2 h-12 overflow-hidden rounded-md px-2 text-left text-xs text-white ${selectedClipId === clip.id ? "ring-2 ring-white" : ""} ${trackTone(track.type)}`}
                        style={{ left: (clip.startMs / 1000) * pixelsPerSecond, width: Math.max(72, (clip.durationMs / 1000) * pixelsPerSecond) }}
                        onPointerDown={(event) => {
                          const startX = event.clientX;
                          const origin = clip.startMs;
                          const move = (pointer: PointerEvent) => {
                            const next = Math.max(0, origin + msFromPixels(pointer.clientX - startX, pixelsPerSecond) - 0);
                            clip.startMs = next;
                          };
                          const up = (pointer: PointerEvent) => {
                            window.removeEventListener("pointermove", move);
                            window.removeEventListener("pointerup", up);
                            const next = Math.max(0, origin + Math.round(((pointer.clientX - startX) / pixelsPerSecond) * 1000));
                            if (Math.abs(next - origin) < 40) {
                              setSelectedClipId(clip.id);
                              return;
                            }
                            setUndoPatch({ clipId: clip.id, patch: { startMs: origin }, revision: timeline.revision });
                            void send({ action: "update-clip", revision: timeline.revision, clipId: clip.id, patch: { startMs: next } });
                          };
                          window.addEventListener("pointermove", move);
                          window.addEventListener("pointerup", up);
                        }}
                      >
                        {clipLabel(clip, timeline) || trackName(track.type, t)}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={timeline.simpleMode ? "hidden" : "space-y-2 md:hidden"}>
            <p className="text-sm text-zinc-700">{t("studio.workspace.v15.narrowTracks")}</p>
            {timeline.tracks.flatMap((track) => track.clips.map((clip) => (
              <button key={clip.id} type="button" className="block min-h-11 w-full rounded-lg border px-3 py-2 text-left text-sm" onClick={() => setSelectedClipId(clip.id)}>
                {trackName(track.type, t)} · {formatClock(clip.startMs)} · {clipLabel(clip, timeline)}
              </button>
            )))}
          </div>

          <div className="@container min-w-0">
          <div className={`grid min-w-0 gap-4 ${selected && !timeline.simpleMode ? "@min-[880px]:grid-cols-[minmax(16rem,1fr)_20rem]" : ""}`}>
            <div className="min-w-0 space-y-3">
              <h3 className="font-semibold">{t("studio.workspace.v15.addScene")}</h3>
              <ul className="space-y-2">
                {timeline.scenes.map((scene) => (
                  <li key={scene.id} className="min-w-0 rounded-lg border p-3 text-sm">
                    <p className="break-words font-semibold">{scene.title || `${scene.order + 1}`}</p>
                    <p>{scene.dialogue.preparedText || t("studio.workspace.v15.noDialogue")}</p>
                    <p className="text-xs text-zinc-500">{scene.dialogue.audioStatus === "ready" ? t("studio.workspace.v15.voiceReady") : t("studio.workspace.v15.voiceMissing")} · {t("studio.workspace.v15.speakerMissing")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className="min-h-11 rounded-full bg-[#006D52] px-3 text-xs font-semibold text-white" onClick={() => void place(scene.id, "VIDEO", "scene")}>{t("studio.workspace.v15.toVideo")}</button>
                      <button type="button" className="min-h-11 rounded-full border px-3 text-xs" onClick={() => void place(scene.id, "DIALOGUE", "scene")}>{t("studio.workspace.v15.toDialogue")}</button>
                    </div>
                  </li>
                ))}
              </ul>
              <h3 className="font-semibold">{t("studio.workspace.v15.addMusic")}</h3>
              <ul className="space-y-2">
                {music.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{item.title}</span>
                    <button type="button" data-testid="film-add-music" className="min-h-11 rounded-full border px-3" onClick={() => void place(item.id, "MUSIC", "user_audio")}>{t("studio.workspace.v15.addMusic")}</button>
                  </li>
                ))}
              </ul>
              <h3 className="font-semibold">{t("studio.workspace.v15.addSfx")}</h3>
              <ul className="space-y-2">
                {soundEffects.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{item.title}</span>
                    <button type="button" data-testid="film-add-sfx" className="min-h-11 rounded-full border px-3" onClick={() => void place(item.id, "SFX", "user_audio")}>{t("studio.workspace.v15.addSfx")}</button>
                  </li>
                ))}
              </ul>
              <button type="button" data-testid="film-add-narration" className="min-h-11 rounded-full border px-3 text-sm" disabled={!timeline.storyboardId} onClick={() => timeline.storyboardId && void place(timeline.storyboardId, "NARRATION", "narration_script")}>
                {t("studio.workspace.v15.addNarration")}
              </button>
              <p className="text-xs text-zinc-500">{timeline.narration.audioStatus === "ready" ? t("studio.workspace.v15.narrationReady") : timeline.narration.script ? t("studio.workspace.v15.narrationMissing") : t("studio.workspace.v15.noNarration")}</p>
            </div>
            {selected && !timeline.simpleMode ? (
              <ClipProperties
                key={selected.clip.id}
                clip={selected.clip}
                onSave={(patch) => rememberAndSend(selected.clip, patch)}
                onMute={() => rememberAndSend(selected.clip, { muted: !selected.clip.muted })}
                onRemove={() => void send({ action: "delete-clip", revision: timeline.revision, clipId: selected.clip.id })}
              />
            ) : null}
          </div>
          </div>

          <section className="scroll-mt-28 space-y-3 rounded-xl border p-3">
            <h3 className="font-semibold">{t("studio.workspace.v15.subtitles")}</h3>
            <input className="min-h-11 w-full rounded border px-2" aria-label={t("studio.workspace.v15.languageSearch")} placeholder={t("studio.workspace.v15.languageSearch")} value={languageQuery} onChange={(event) => setLanguageQuery(event.target.value)} />
            {languageQuery.trim() ? (
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {languages.map((language) => (
                <button key={language.tag} type="button" className="min-h-11 rounded-full border px-3 text-sm" onClick={() => void send({ action: "add-language", revision: timeline.revision, language: language.tag }).then(() => chooseLanguage(language.tag))}>
                  {language.label}
                </button>
              ))}
            </div>
            ) : null}
            <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void send({ action: "add-language", revision: timeline.revision, language: customLanguage }).then(() => chooseLanguage(customLanguage)); }}>
              <input className="min-h-11 flex-1 rounded border px-2" aria-label={t("studio.workspace.v15.languageTag")} value={customLanguage} placeholder="es-MX" onChange={(event) => setCustomLanguage(event.target.value)} />
              <button type="submit" className="min-h-11 rounded-full bg-[#006D52] px-3 text-sm font-semibold text-white">{t("studio.workspace.v15.addLanguage")}</button>
            </form>
            <div className="flex flex-wrap gap-2">
              {timeline.subtitles.map((track) => (
                <button key={track.language} type="button" className={`min-h-11 rounded-full px-3 text-sm ${editingLanguage === track.language ? "bg-[#0067B1] text-white" : "border"}`} onClick={() => chooseLanguage(track.language)}>
                  {languageLabel(track.language)} · {track.status}
                </button>
              ))}
            </div>
            {editingLanguage ? (
              <div className="space-y-2">
                {draftCues.map((cue, index) => (
                  <div key={cue.id ?? index} className="grid gap-2 sm:grid-cols-[1fr_90px_90px_auto]">
                    <input className="min-h-11 rounded border px-2" aria-label={t("studio.workspace.v15.cueText")} value={cue.text} onChange={(event) => setDraftCues((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, text: event.target.value } : row))} />
                    <input className="min-h-11 rounded border px-2" aria-label={t("studio.workspace.v15.cueStart")} type="number" value={cue.startMs} onChange={(event) => setDraftCues((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, startMs: Number(event.target.value) } : row))} />
                    <input className="min-h-11 rounded border px-2" aria-label={t("studio.workspace.v15.cueEnd")} type="number" value={cue.endMs} onChange={(event) => setDraftCues((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, endMs: Number(event.target.value) } : row))} />
                    <button type="button" className="min-h-11 rounded border px-2 text-sm" onClick={() => setDraftCues((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}>{t("studio.workspace.v15.deleteCue")}</button>
                  </div>
                ))}
                <button type="button" className="min-h-11 rounded-full border px-3 text-sm" onClick={() => setDraftCues((rows) => [...rows, { text: "", startMs: rows.at(-1)?.endMs ?? 0, endMs: (rows.at(-1)?.endMs ?? 0) + 2000 }])}>{t("studio.workspace.v15.addCue")}</button>
                <button type="button" data-testid="film-subtitle-save" className="min-h-11 rounded-full bg-[#006D52] px-3 text-sm font-semibold text-white" onClick={() => void send({ action: "save-cues", revision: timeline.revision, language: editingLanguage, cues: draftCues })}>{t("studio.workspace.v15.saveCues")}</button>
                <button type="button" className="min-h-11 rounded-full border px-3 text-sm" onClick={() => void send({ action: "remove-language", revision: timeline.revision, language: editingLanguage })}>{t("studio.workspace.v15.removeLanguage")}</button>
                <a data-testid="film-export-srt" download className="inline-flex min-h-11 items-center text-sm text-[#0067B1]" href={`/api/studio/projects/${projectId}/timeline?export=srt&language=${encodeURIComponent(editingLanguage)}`}>{t("studio.workspace.v15.exportSrt")}</a>
                <a data-testid="film-export-vtt" download className="inline-flex min-h-11 items-center text-sm text-[#0067B1]" href={`/api/studio/projects/${projectId}/timeline?export=vtt&language=${encodeURIComponent(editingLanguage)}`}>{t("studio.workspace.v15.exportVtt")}</a>
              </div>
            ) : null}
            <p className="text-xs text-zinc-500">{t("studio.workspace.v15.burnedInUnavailable")}</p>
            <p className="text-xs text-zinc-500">{t("studio.workspace.v15.noAudioMix")}</p>
          </section>
        </>
      )}
    </div>
  );

  function place(sourceId: string, type: string, sourceKind: string) {
    const track = timeline?.tracks.find((item) => item.type === type && (type === "SUBTITLE" || item.language === ""));
    if (!track || !timeline) return;
    void send({
      action: "add-clip",
      revision: timeline.revision,
      trackId: track.id,
      sourceKind,
      sourceId,
      startMs: timeline.filmEndMs,
      clientRequestId: "",
    });
  }

  function rememberAndSend(clip: Clip, patch: Record<string, unknown>) {
    if (!timeline) return Promise.resolve(false);
    const previous: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) previous[key] = clip[key as keyof Clip];
    setUndoPatch({ clipId: clip.id, patch: previous, revision: timeline.revision });
    return send({ action: "update-clip", revision: timeline.revision, clipId: clip.id, patch }).then((next) => next != null);
  }
}

function ClipProperties({
  clip,
  onSave,
  onMute,
  onRemove,
}: {
  clip: Clip;
  onSave: (patch: Record<string, number>) => Promise<boolean>;
  onMute: () => Promise<boolean>;
  onRemove: () => void;
}) {
  const t = useActiveTranslator();
  const [draft, setDraft] = useState<ClipDraft>(() => draftFromClip(clip));
  const draftRef = useRef(draft);
  const [status, setStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "invalid" | "failed">("idle");
  const saving = useRef(false);

  useEffect(() => {
    if (status !== "unsaved") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  function edit(field: keyof ClipDraft, value: string) {
    const next = { ...draftRef.current, [field]: value };
    draftRef.current = next;
    setDraft(next);
    setStatus("unsaved");
  }

  async function save() {
    if (saving.current) return;
    const result = clipDraftPatch(clip, draftRef.current);
    if (!result.ok) {
      setStatus("invalid");
      return;
    }
    if (Object.keys(result.patch).length === 0) {
      setStatus("saved");
      return;
    }
    saving.current = true;
    setStatus("saving");
    const ok = await onSave(result.patch);
    saving.current = false;
    setStatus(ok ? "saved" : "failed");
  }

  const statusText =
    status === "unsaved" ? t("studio.workspace.v15.clipUnsaved")
    : status === "saving" ? t("studio.workspace.v15.clipSaving")
    : status === "saved" ? t("studio.workspace.v15.clipSaved")
    : status === "invalid" ? t("studio.workspace.v15.clipInvalid")
    : status === "failed" ? t("studio.workspace.v15.saveFailed")
    : "";

  return (
    <form noValidate className="space-y-2 rounded-xl border p-3 text-sm" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <h3 className="font-semibold">{t("studio.workspace.v15.properties")}</h3>
      <label className="block">{t("studio.workspace.v15.start")}<input data-testid="film-clip-start" className="mt-1 min-h-11 w-full rounded border px-2 text-zinc-900" type="number" min={0} value={draft.startMs} onChange={(event) => edit("startMs", event.target.value)} onBlur={() => void save()} /></label>
      <label className="block">{t("studio.workspace.v15.duration")}<input data-testid="film-clip-duration" className="mt-1 min-h-11 w-full rounded border px-2 text-zinc-900" type="number" min={1} value={draft.durationMs} onChange={(event) => edit("durationMs", event.target.value)} onBlur={() => void save()} /></label>
      <label className="block">{t("studio.workspace.v15.trimIn")}<input data-testid="film-clip-trim" className="mt-1 min-h-11 w-full rounded border px-2 text-zinc-900" type="number" min={0} value={draft.inMs} onChange={(event) => edit("inMs", event.target.value)} onBlur={() => void save()} /></label>
      <label className="block">{t("studio.workspace.v15.volume")}<input data-testid="film-clip-volume" className="mt-1 min-h-11 w-full rounded border px-2 text-zinc-900" type="number" min={0} max={100} step="any" value={draft.volume} onChange={(event) => edit("volume", event.target.value)} onBlur={() => void save()} /></label>
      <p className="min-h-5 text-xs text-zinc-600" role="status">{statusText}</p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="min-h-11 rounded-full bg-[#006D52] px-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0067B1]">{t("studio.workspace.v15.saveClip")}</button>
        <button type="button" data-testid="film-clip-mute" className="min-h-11 rounded-full border px-3" onClick={() => void onMute()}>{clip.muted ? t("studio.workspace.v15.unmute") : t("studio.workspace.v15.mute")}</button>
        <button type="button" data-testid="film-clip-remove" className="min-h-11 rounded-full border border-red-300 px-3 text-red-700" onClick={onRemove}>{t("studio.workspace.v15.removeClip")}</button>
      </div>
    </form>
  );
}

function FileButton({ label, accept, onFile }: { label: string; accept: string; onFile: (file: File) => void }) {
  return (
    <label className="min-h-11 cursor-pointer rounded-full border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900">
      {label}
      <input
        className="sr-only"
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function trackTone(type: string): string {
  switch (type) {
    case "DIALOGUE": return "bg-[var(--studio-track-dialogue)]";
    case "NARRATION": return "bg-[var(--studio-track-narration)]";
    case "MUSIC": return "bg-[var(--studio-track-music)]";
    case "SFX": return "bg-[var(--studio-track-sfx)]";
    case "SUBTITLE": return "bg-[var(--studio-track-subtitle)]";
    default: return "bg-[var(--studio-track-video)]";
  }
}

function trackName(type: string, t: ReturnType<typeof useActiveTranslator>): string {
  switch (type) {
    case "VIDEO": return t("studio.workspace.v15.track.VIDEO");
    case "DIALOGUE": return t("studio.workspace.v15.track.DIALOGUE");
    case "NARRATION": return t("studio.workspace.v15.track.NARRATION");
    case "MUSIC": return t("studio.workspace.v15.track.MUSIC");
    case "SFX": return t("studio.workspace.v15.track.SFX");
    case "SUBTITLE": return t("studio.workspace.v15.track.SUBTITLE");
    default: return type;
  }
}

function readVideoDuration(file: File): Promise<number> {
  return readMediaDuration(file, "video");
}

function readMediaDuration(file: File, kind: "video" | "audio"): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(kind);
    let settled = false;
    let timer = 0;
    const finish = (duration: number) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) && duration > 0 ? duration : 0);
    };
    timer = window.setTimeout(() => finish(0), 4000);
    media.preload = "metadata";
    media.onloadedmetadata = () => finish(media.duration);
    media.onerror = () => finish(0);
    media.src = url;
  });
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function languageLabel(tag: string): string {
  return COMMON_SUBTITLE_LANGUAGES.find((language) => language.tag === tag)?.label ?? tag;
}

function clipLabel(clip: Clip, timeline: Timeline): string {
  const scene = timeline.scenes.find((item) => item.id === clip.sourceId);
  if (scene) return scene.title || scene.dialogue.preparedText || scene.id;
  if (clip.text) return clip.text;
  if (clip.sourceKind === "user_audio" || clip.sourceKind === "uploaded_image" || clip.sourceKind === "uploaded_video" || clip.sourceKind === "library_asset") return "";
  return clip.sourceKind;
}
