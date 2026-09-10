"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createTrackedObjectUrl } from "@/lib/blob-object-url-lifecycle";
import { exportPublishProject } from "@/lib/publish-export-client";
import {
  SIMPLE_STUDIO_CATALOG,
  simpleStudioCatalogEntry,
  type SimpleStudioPurpose,
} from "@/lib/simple-studio/catalog";
import type {
  SimpleStudioCreativePlan,
  SimpleStudioMediaItem,
  SimpleStudioPlanSummaryNl,
} from "@/lib/simple-studio/creative-plan";
import {
  generateSimpleStudioProject,
  reviseSimpleStudioProject,
  simpleStudioAdvancedEditorPath,
} from "@/lib/simple-studio/orchestrator";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { PublishProject } from "@/types/publish-overlay";
import type { PublishStorySceneBlock } from "@/lib/publish-story-proposal";

type Phase = "compose" | "confirm" | "generating" | "result" | "revising" | "exporting";

function ScenePreview({
  imageUrl,
  scenes,
  cta,
  label,
}: {
  imageUrl: string;
  scenes: PublishStorySceneBlock[];
  cta: string;
  label: string;
}) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (scenes.length <= 1) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % scenes.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [scenes.length]);
  const scene = scenes[active] ?? scenes[0];
  return (
    <div
      className="mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-lg"
      style={{ aspectRatio: "9 / 16" }}
      data-testid="simple-studio-preview"
    >
      <div className="relative h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-16">
          <p className="text-sm font-semibold leading-snug text-white">
            {scene?.overlayText || cta}
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-wide text-emerald-300">
            {scene?.title || label} · 9:16
          </p>
        </div>
      </div>
    </div>
  );
}

export function SimpleStudioHub() {
  return (
    <div
      className="mx-auto min-h-[100dvh] w-full max-w-lg px-4 pb-28 pt-6 sm:pb-10"
      data-testid="simple-studio-hub"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
            HomeCheff Studio
          </p>
          <h1 className="text-2xl font-bold text-zinc-900">Wat wil je maken?</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Upload wat je hebt en vertel het in gewone taal — Studio kiest de rest.
          </p>
        </div>
        <Link href="/studio" className="text-sm font-medium text-[#006D52] underline">
          Terug
        </Link>
      </div>

      <SimpleStudioCreatePage purpose="universal" embedInHub />

      <div className="mt-10 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Of kies een snelkoppeling</h2>
        {SIMPLE_STUDIO_CATALOG.map((entry) => (
          <Link
            key={entry.purpose}
            href={entry.href}
            data-testid={`simple-studio-intent-${entry.purpose}`}
            className={`block ${studioVisual.editorSurface} px-4 py-3 transition hover:border-[#006D52]/40`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-zinc-900">{entry.titleNl}</span>
              {entry.free ? (
                <span className="rounded-full bg-[#006D52]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#006D52]">
                  Gratis
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-zinc-600">{entry.descNl}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SimpleStudioCreatePage({
  purpose: purposeProp = "universal",
  embedInHub = false,
}: {
  purpose?: SimpleStudioPurpose | "universal" | string;
  embedInHub?: boolean;
}) {
  const purpose =
    purposeProp === "universal"
      ? "universal"
      : (String(purposeProp) as SimpleStudioPurpose | "universal");

  const catalog =
    purpose !== "universal" ? simpleStudioCatalogEntry(purpose as SimpleStudioPurpose) : null;
  const shared = purpose === "universal" || catalog?.usesSharedOrchestrator === true;

  useEffect(() => {
    if (!shared && catalog && typeof window !== "undefined") {
      window.location.href = catalog.href;
    }
  }, [shared, catalog]);

  const [phase, setPhase] = useState<Phase>("compose");
  const [media, setMedia] = useState<SimpleStudioMediaItem[]>([]);
  const [story, setStory] = useState("");
  const [project, setProject] = useState<PublishProject | null>(null);
  const [plan, setPlan] = useState<SimpleStudioCreativePlan | null>(null);
  const [summary, setSummary] = useState<SimpleStudioPlanSummaryNl | null>(null);
  const [quoteCredits, setQuoteCredits] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [revisionText, setRevisionText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState("Bezig…");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [preparedVoiceUrl, setPreparedVoiceUrl] = useState<string | null>(null);
  const [preparedMusicUrl, setPreparedMusicUrl] = useState<string | null>(null);
  const [preparedMusicId, setPreparedMusicId] = useState<string | null>(null);
  const [preparedMusicLabel, setPreparedMusicLabel] = useState<string | null>(null);
  const [lipsyncConfigured, setLipsyncConfigured] = useState(false);

  const scenes = useMemo(() => {
    const raw = project?.metadata?.publishScenes;
    return Array.isArray(raw) ? (raw as PublishStorySceneBlock[]) : [];
  }, [project]);

  const previewImage =
    media.find((m) => m.kind === "image")?.url ||
    project?.imageUrl ||
    media[0]?.url ||
    null;

  const onPickFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const next: SimpleStudioMediaItem[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        next.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          kind: "image",
          url: createTrackedObjectUrl(file),
          name: file.name,
        });
      } else if (file.type.startsWith("video/")) {
        next.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          kind: "video",
          url: createTrackedObjectUrl(file),
          name: file.name,
        });
      }
    }
    if (!next.length) {
      setError("Kies foto’s of video’s.");
      return;
    }
    setMedia((prev) => [...prev, ...next].slice(0, 8));
  };

  const loadQuote = useCallback(async () => {
    setQuoteError(null);
    try {
      const res = await fetch("/api/studio/simple/quote", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          purpose,
          media: media.map(({ id, kind, url, name }) => ({ id, kind, url, name })),
        }),
      });
      if (res.status === 401) {
        setQuoteCredits(null);
        setQuoteError("Log in om de kosten te zien. Voorvertoning plannen kan wel.");
        // Local plan fallback without quote
        const { buildCreativePlanV2 } = await import("@/lib/simple-studio/intent-routing");
        const { summarizeCreativePlanNl } = await import("@/lib/simple-studio/creative-plan");
        const localPlan = buildCreativePlanV2({
          story,
          media,
          purposeHint: purpose,
        });
        setPlan(localPlan);
        setSummary(summarizeCreativePlanNl(localPlan, null));
        return;
      }
      if (!res.ok) {
        setQuoteError("Kosten konden niet worden opgehaald.");
        return;
      }
      const json = (await res.json()) as {
        plan: SimpleStudioCreativePlan;
        summary: SimpleStudioPlanSummaryNl;
        quote: { requiredCredits: number; allowed: boolean };
        lipsyncConfigured?: boolean;
      };
      setPlan(json.plan);
      setSummary(json.summary);
      setQuoteCredits(json.quote.requiredCredits);
      setLipsyncConfigured(json.lipsyncConfigured === true);
    } catch {
      setQuoteError("Kosten konden niet worden opgehaald.");
    }
  }, [story, purpose, media]);

  if (!shared && catalog) {
    return (
      <div className="mx-auto max-w-lg p-6 text-sm text-zinc-700">
        Doorsturen naar {catalog.titleNl}…
        <Link href={catalog.href} className="ml-2 underline text-[#006D52]">
          Open
        </Link>
      </div>
    );
  }

  const goConfirm = async () => {
    setError(null);
    if (!media.length) {
      setError("Voeg minstens één foto of video toe.");
      return;
    }
    if (story.trim().length < 12) {
      setError("Vertel kort wat je wilt maken.");
      return;
    }
    setPhase("confirm");
    await loadQuote();
  };

  const prepareAudioIfNeeded = async (activePlan: SimpleStudioCreativePlan, projectId?: string) => {
    if (!activePlan.voice.required && !activePlan.music.required && !activePlan.lipsync.requested) {
      return {
        voiceAudioUrl: null as string | null,
        musicTrackUrl: null as string | null,
        musicTrackId: null as string | null,
        musicLabel: null as string | null,
      };
    }
    setProgressLabel("Stem en muziek voorbereiden…");
    const res = await fetch("/api/studio/simple/prepare-audio", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script: activePlan.dialogue || activePlan.narration || story.slice(0, 500),
        language: activePlan.voice.language,
        voiceProfile: activePlan.voice.profile,
        musicMood: activePlan.music.mood,
        musicRequired: activePlan.music.required,
        projectId,
      }),
    });
    if (res.status === 401 || res.status === 402 || res.status === 403) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof err?.error === "string"
          ? err.error
          : "Stem/muziek voorbereiden vereist inloggen en voldoende HC.",
      );
    }
    if (!res.ok) throw new Error("Stem of muziek voorbereiden mislukt.");
    const json = (await res.json()) as {
      voiceAudioUrl?: string | null;
      musicTrackUrl?: string | null;
      musicTrackId?: string | null;
      musicLabel?: string | null;
      musicSource?: string;
    };
    if (activePlan.music.required && json.musicSource === "unavailable") {
      setError(
        "Muziek gevraagd, maar de gratis muziekcatalogus is nu niet beschikbaar. We maken de video zonder muziekbed.",
      );
    }
    return {
      voiceAudioUrl: json.voiceAudioUrl ?? null,
      musicTrackUrl: json.musicTrackUrl ?? null,
      musicTrackId: json.musicTrackId ?? null,
      musicLabel: json.musicLabel ?? null,
    };
  };

  const uploadImageForLipsync = async (imageUrl: string): Promise<string> => {
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
    const blobRes = await fetch(imageUrl);
    const blob = await blobRes.blob();
    const form = new FormData();
    form.append("file", blob, "lipsync-source.jpg");
    const up = await fetch("/api/uploads/images", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!up.ok) throw new Error("Foto upload voor lipsync mislukt.");
    const json = (await up.json()) as { url?: string; imageUrl?: string };
    const url = json.url || json.imageUrl;
    if (!url) throw new Error("Geen publieke foto-URL na upload.");
    return url;
  };

  const runLipsyncIfNeeded = async (input: {
    plan: SimpleStudioCreativePlan;
    audioUrl: string | null;
    projectId: string;
  }): Promise<string | null> => {
    if (!input.plan.lipsync.requested || !input.plan.lipsync.available) return null;
    if (!input.audioUrl) throw new Error("Stem ontbreekt voor lipsync.");
    const sourceImage =
      input.plan.sourceMedia.find((m) => m.kind === "image")?.url ||
      media.find((m) => m.kind === "image")?.url;
    if (!sourceImage) throw new Error("Geen foto gevonden voor lipsync.");
    setProgressLabel("Persoon wordt tot leven gebracht…");
    const publicImage = await uploadImageForLipsync(sourceImage);
    const res = await fetch("/api/studio/simple/lipsync", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: publicImage,
        audioUrl: input.audioUrl,
        projectId: input.projectId,
        durationSeconds: input.plan.durationSeconds,
        aspectRatio: input.plan.aspectRatio,
        behaviorPrompt:
          input.plan.tone ||
          "Natural talking head, subtle motion, friendly expression, looking at camera.",
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        typeof err?.error === "string" ? err.error : "Lipsync mislukt.",
      );
    }
    const json = (await res.json()) as { videoUrl?: string; lipsyncExecuted?: boolean };
    if (!json.videoUrl) throw new Error("Lipsync leverde geen video.");
    return json.videoUrl;
  };

  const runGenerate = async (revision?: string) => {
    setError(null);
    setDownloadUrl(null);
    setPhase(revision ? "revising" : "generating");
    setProgressLabel("Studio begrijpt je verzoek…");
    try {
      const { buildCreativePlanV2 } = await import("@/lib/simple-studio/intent-routing");
      const activePlan =
        plan && !revision
          ? plan
          : buildCreativePlanV2({
              story,
              media,
              purposeHint: purpose,
              revisionInstruction: revision,
              lipsyncEngineAvailable: lipsyncConfigured || plan?.lipsync.available === true,
            });
      setPlan(activePlan);

      if (activePlan.engineChain.includes("motion_deeplink")) {
        window.location.href = "/motion/start";
        return;
      }
      if (activePlan.engineChain.includes("photo_video_deeplink")) {
        window.location.href = "/studio/photo-video";
        return;
      }

      const audio = await prepareAudioIfNeeded(activePlan, project?.id);
      setPreparedVoiceUrl(audio.voiceAudioUrl);
      setPreparedMusicUrl(audio.musicTrackUrl);
      setPreparedMusicId(audio.musicTrackId);
      setPreparedMusicLabel(audio.musicLabel);

      setProgressLabel(
        activePlan.lipsync.requested && activePlan.lipsync.available
          ? "Stem wordt gemaakt…"
          : "Video opbouwen…",
      );
      const result =
        revision && project
          ? reviseSimpleStudioProject({
              project,
              revisionInstruction: revision,
              voiceAudioUrl: audio.voiceAudioUrl,
              musicTrackUrl: audio.musicTrackUrl,
              musicTrackId: audio.musicTrackId,
              musicLabel: audio.musicLabel,
              lipsyncEngineAvailable: lipsyncConfigured || activePlan.lipsync.available,
            })
          : generateSimpleStudioProject({
              purpose,
              media,
              story,
              revisionInstruction: revision,
              existingProjectId: project?.id,
              existingPlan: activePlan,
              lipsyncEngineAvailable: lipsyncConfigured || activePlan.lipsync.available,
              voiceAudioUrl: audio.voiceAudioUrl,
              musicTrackUrl: audio.musicTrackUrl,
              musicTrackId: audio.musicTrackId,
              musicLabel: audio.musicLabel,
            });

      let nextProject = result.project;
      const lipsyncVideoUrl = await runLipsyncIfNeeded({
        plan: result.plan,
        audioUrl: audio.voiceAudioUrl,
        projectId: nextProject.id,
      });
      if (lipsyncVideoUrl) {
        nextProject = {
          ...nextProject,
          videoUrl: lipsyncVideoUrl,
          metadata: {
            ...nextProject.metadata,
            lipsyncExecuted: true,
            lipsyncVideoUrl,
            renderMode: "video_overlay",
            publishEntryMode: "video_enhancement",
            simpleStudioPlan: result.plan,
          },
        };
      }

      setProject(nextProject);
      setPlan(result.plan);
      setSummary(result.summaryNl);
      setRevisionText("");
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Maken mislukt");
      setPhase(project ? "result" : "compose");
    }
  };

  const runExport = async () => {
    if (!project || !plan) return;
    setError(null);
    setPhase("exporting");
    setProgressLabel("Exporteren…");

    // True lipsync output is already a complete talking MP4 (speech baked in).
    if (project.metadata?.lipsyncExecuted === true && project.videoUrl) {
      setDownloadUrl(project.videoUrl);
      const a = document.createElement("a");
      a.href = project.videoUrl;
      a.download = `${project.name.replace(/\s+/g, "-").slice(0, 40) || "studio"}.mp4`;
      a.rel = "noopener";
      a.target = "_blank";
      a.click();
      setPhase("result");
      return;
    }

    const result = await exportPublishProject(project);
    if (!result.ok || !result.downloadUrl) {
      setError("Export mislukt. Controleer je tegoed of probeer opnieuw.");
      setPhase("result");
      return;
    }
    setDownloadUrl(result.downloadUrl);
    const a = document.createElement("a");
    a.href = result.downloadUrl;
    a.download = `${project.name.replace(/\s+/g, "-").slice(0, 40) || "studio"}.mp4`;
    a.click();
    setPhase("result");
  };

  const title =
    purpose === "universal"
      ? "Eenvoudig maken"
      : catalog?.titleNl || "Eenvoudig maken";

  return (
    <div
      className={
        embedInHub
          ? "w-full"
          : "mx-auto min-h-[100dvh] w-full max-w-lg px-4 pb-28 pt-6 sm:pb-10"
      }
      data-testid="simple-studio-create"
      data-purpose={purpose}
    >
      {!embedInHub ? (
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
              HomeCheff Studio
            </p>
            <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
          </div>
          <Link href="/studio/simple" className="text-sm font-medium text-[#006D52] underline">
            Overzicht
          </Link>
        </div>
      ) : null}

      {(phase === "compose" || phase === "confirm") && (
        <div className={`space-y-5 ${studioVisual.editorSurface} p-4 sm:p-5`} data-testid="simple-studio-universal-box">
          <section>
            <h2 className="text-sm font-semibold text-zinc-900">Upload foto’s of video’s</h2>
            <label
              className="mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center"
              data-testid="simple-studio-photo-drop"
            >
              {media.length ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {media.map((m) =>
                    m.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={m.id}
                        src={m.url}
                        alt={m.name ?? ""}
                        className="h-20 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <span
                        key={m.id}
                        className="flex h-20 w-16 items-center justify-center rounded-lg bg-zinc-800 text-[10px] text-white"
                      >
                        Video
                      </span>
                    ),
                  )}
                </div>
              ) : (
                <span className="text-sm font-medium text-zinc-700">+ Foto’s of video’s toevoegen</span>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="sr-only"
                data-testid="simple-studio-photo-input"
                onChange={(e) => onPickFiles(e.target.files)}
              />
            </label>
            {media.length > 0 ? (
              <button
                type="button"
                className="mt-2 text-xs text-zinc-500 underline"
                onClick={() => setMedia([])}
              >
                Wissen
              </button>
            ) : null}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-zinc-900">Vertel Studio wat je wilt maken</h2>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              rows={5}
              data-testid="simple-studio-story"
              placeholder='Bijvoorbeeld: “Laat deze persoon vertellen dat mijn winkel zaterdag open is. Laat hem natuurlijk bewegen en praten, gebruik vrolijke achtergrondmuziek en maak er een Instagram-video van.”'
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none ring-[#006D52] placeholder:text-zinc-400 focus:ring-2"
            />
          </section>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {phase === "compose" ? (
            <button
              type="button"
              data-testid="simple-studio-primary-cta"
              onClick={() => void goConfirm()}
              className="w-full rounded-xl bg-[#006D52] px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Maak het
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
              <p className="text-sm font-semibold text-zinc-900">
                {summary?.headline || "Studio gaat maken"}
              </p>
              <ul className="space-y-1 text-sm text-zinc-700">
                {(summary?.bullets ?? []).map((b) => (
                  <li key={b}>• {b}</li>
                ))}
              </ul>
              <p className="text-sm font-semibold text-zinc-900">
                {summary?.costLabel ||
                  (quoteCredits != null ? `Kosten: ${quoteCredits} HC` : "Kosten…")}
              </p>
              {quoteError ? <p className="text-xs text-amber-800">{quoteError}</p> : null}
              {(summary?.warnings ?? []).map((w) => (
                <p key={w} className="text-xs text-amber-900">
                  {w}
                </p>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-medium"
                  onClick={() => setPhase("compose")}
                >
                  Terug
                </button>
                <button
                  type="button"
                  data-testid="simple-studio-confirm-generate"
                  className="flex-1 rounded-xl bg-[#006D52] px-3 py-2.5 text-sm font-semibold text-white"
                  onClick={() => void runGenerate()}
                >
                  Maak video
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(phase === "generating" || phase === "revising" || phase === "exporting") && (
        <div
          className={`flex min-h-[240px] flex-col items-center justify-center gap-3 ${studioVisual.editorSurface} p-8`}
          data-testid="simple-studio-progress"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#006D52] border-t-transparent" />
          <p className="text-sm font-medium text-zinc-800">{progressLabel}</p>
        </div>
      )}

      {phase === "result" && project && (previewImage || project.videoUrl) ? (
        <div className="space-y-5">
          {project.videoUrl && project.metadata?.lipsyncExecuted === true ? (
            <video
              src={project.videoUrl}
              controls
              playsInline
              className="mx-auto w-full max-w-[280px] rounded-2xl border border-zinc-200 bg-black shadow-lg"
              style={{ aspectRatio: "9 / 16" }}
              data-testid="simple-studio-preview-video"
            />
          ) : previewImage ? (
            <ScenePreview
              imageUrl={previewImage}
              scenes={scenes}
              cta={plan?.cta || "Meer info"}
              label={title}
            />
          ) : null}
          {plan ? (
            <div className={`${studioVisual.editorSurface} space-y-1 p-4 text-sm text-zinc-700`}>
              <p>
                <span className="font-semibold">Intent:</span> {plan.purpose}
              </p>
              {plan.lipsync.requested ? (
                <p className="text-amber-800">
                  Lipsync gevraagd — niet beschikbaar; stem/tekst gebruikt waar mogelijk.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900">Pas aan</label>
            <textarea
              value={revisionText}
              onChange={(e) => setRevisionText(e.target.value)}
              rows={3}
              data-testid="simple-studio-revision"
              placeholder='Bijvoorbeeld: “Geen muziek.” of “Gebruik een vrouwelijke stem.”'
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {downloadUrl ? (
            <p className="text-sm text-emerald-700">
              Export klaar.{" "}
              <a className="underline" href={downloadUrl} download>
                Opnieuw downloaden
              </a>
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              data-testid="simple-studio-revise"
              disabled={!revisionText.trim()}
              onClick={() => void runGenerate(revisionText.trim())}
              className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Pas aan
            </button>
            <button
              type="button"
              data-testid="simple-studio-regenerate"
              onClick={() => void runGenerate()}
              className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-800"
            >
              Nieuwe variant
            </button>
            <button
              type="button"
              data-testid="simple-studio-export"
              onClick={() => void runExport()}
              className="rounded-xl bg-[#006D52] px-4 py-3 text-sm font-semibold text-white sm:col-span-2"
            >
              Exporteren
              {quoteCredits != null && quoteCredits > 0 ? ` · ${quoteCredits} HC` : ""}
            </button>
            <Link
              href={simpleStudioAdvancedEditorPath(project.id)}
              className="rounded-xl border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-700 sm:col-span-2"
              data-testid="simple-studio-advanced"
            >
              Geavanceerd bewerken
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
