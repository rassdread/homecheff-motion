"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createTrackedObjectUrl } from "@/lib/blob-object-url-lifecycle";
import { exportPublishProject } from "@/lib/publish-export-client";
import {
  generateQuickAdProject,
  QUICK_AD_ADVANCED_EDITOR_PATH,
  QUICK_AD_EXPORT_ACTION,
  reviseQuickAdProject,
} from "@/lib/quick-ad/quick-ad-orchestrator";
import type { QuickAdIntent, QuickAdPlatform } from "@/lib/quick-ad/quick-ad-intent";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { PublishProject } from "@/types/publish-overlay";
import type { PublishStorySceneBlock } from "@/lib/publish-story-proposal";

type Phase = "compose" | "confirm" | "generating" | "result" | "revising" | "exporting";

type CreditPreview = {
  allowed: boolean;
  requiredCredits: number;
  reason?: string | null;
};

function ScenePreview({
  imageUrl,
  scenes,
  cta,
}: {
  imageUrl: string;
  scenes: PublishStorySceneBlock[];
  cta: string;
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
      data-testid="quick-ad-preview"
    >
      <div className="relative h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-16">
          <p className="text-sm font-semibold leading-snug text-white">
            {scene?.overlayText || cta}
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-wide text-emerald-300">
            {scene?.title || "Advertentie"} · 9:16
          </p>
        </div>
      </div>
    </div>
  );
}

export function QuickAdPage() {
  const [phase, setPhase] = useState<Phase>("compose");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [story, setStory] = useState("");
  const [platforms, setPlatforms] = useState<QuickAdPlatform[]>(["instagram", "facebook"]);
  const [project, setProject] = useState<PublishProject | null>(null);
  const [intent, setIntent] = useState<QuickAdIntent | null>(null);
  const [creditPreview, setCreditPreview] = useState<CreditPreview | null>(null);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [revisionText, setRevisionText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState("Je advertentie wordt gemaakt…");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const scenes = useMemo(() => {
    const raw = project?.metadata?.publishScenes;
    return Array.isArray(raw) ? (raw as PublishStorySceneBlock[]) : [];
  }, [project]);

  const onPickPhoto = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Kies een afbeelding (foto).");
      return;
    }
    setError(null);
    setPhotoUrl(createTrackedObjectUrl(file));
    setPhotoName(file.name);
  };

  const togglePlatform = (p: QuickAdPlatform) => {
    setPlatforms((prev) => {
      if (prev.includes(p)) {
        const next = prev.filter((x) => x !== p);
        return next.length ? next : prev;
      }
      return [...prev, p];
    });
  };

  const loadExportQuote = useCallback(async () => {
    setCreditError(null);
    try {
      const res = await fetch("/api/me/studio-credits/preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: QUICK_AD_EXPORT_ACTION }),
      });
      if (res.status === 401) {
        setCreditPreview(null);
        setCreditError("Log in om de exportkosten te zien. Voorvertoning maken kan wel.");
        return;
      }
      if (!res.ok) {
        setCreditPreview(null);
        setCreditError("Kosten konden niet worden opgehaald.");
        return;
      }
      const json = (await res.json()) as { preview?: CreditPreview };
      if (json.preview) setCreditPreview(json.preview);
    } catch {
      setCreditError("Kosten konden niet worden opgehaald.");
    }
  }, []);

  const goConfirm = async () => {
    setError(null);
    if (!photoUrl) {
      setError("Voeg eerst een foto toe.");
      return;
    }
    if (story.trim().length < 12) {
      setError("Vertel kort wat je wilt promoten.");
      return;
    }
    setPhase("confirm");
    await loadExportQuote();
  };

  const runGenerate = async (revision?: string) => {
    if (!photoUrl) return;
    setError(null);
    setDownloadUrl(null);
    setPhase(revision ? "revising" : "generating");
    setProgressLabel("Beeld voorbereiden…");
    await new Promise((r) => setTimeout(r, 280));
    setProgressLabel("Advertentie opbouwen…");
    try {
      const result = revision && project
        ? reviseQuickAdProject({ project, revisionInstruction: revision })
        : generateQuickAdProject({
            imageUrl: photoUrl,
            story,
            platforms,
            revisionInstruction: revision,
            existingProjectId: project?.id,
          });
      setProgressLabel("Video afronden…");
      await new Promise((r) => setTimeout(r, 220));
      setProject(result.project);
      setIntent(result.intent);
      setRevisionText("");
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Maken mislukt");
      setPhase(project ? "result" : "compose");
    }
  };

  const runExport = async () => {
    if (!project) return;
    setError(null);
    setPhase("exporting");
    const result = await exportPublishProject(project);
    if (!result.ok || !result.downloadUrl) {
      setError(
        result.errorKey === "publish.exportFallback"
          ? "Export mislukt. Controleer je tegoed of probeer opnieuw."
          : "Export mislukt.",
      );
      setPhase("result");
      return;
    }
    setDownloadUrl(result.downloadUrl);
    const a = document.createElement("a");
    a.href = result.downloadUrl;
    a.download = `${project.name.replace(/\s+/g, "-").slice(0, 40) || "advertentie"}.mp4`;
    a.click();
    setPhase("result");
  };

  return (
    <div
      className="mx-auto min-h-[100dvh] w-full max-w-lg px-4 pb-28 pt-6 sm:pb-10"
      data-testid="quick-ad-page"
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
            HomeCheff Studio
          </p>
          <h1 className="text-2xl font-bold text-zinc-900">Maak je advertentie</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Eén foto + korte beschrijving → verticale social advertentie.
          </p>
        </div>
        <Link href="/studio" className="text-sm font-medium text-[#006D52] underline">
          Terug
        </Link>
      </div>

      {(phase === "compose" || phase === "confirm") && (
        <div className={`space-y-5 ${studioVisual.editorSurface} p-4 sm:p-5`}>
          <section>
            <h2 className="text-sm font-semibold text-zinc-900">1. Voeg een foto toe</h2>
            <label
              className="mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center"
              data-testid="quick-ad-photo-drop"
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={photoName ?? "Foto"}
                  className="max-h-40 rounded-lg object-contain"
                />
              ) : (
                <span className="text-sm font-medium text-zinc-700">+ Foto toevoegen</span>
              )}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                data-testid="quick-ad-photo-input"
                onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
              />
              {photoName ? (
                <span className="mt-2 text-xs text-zinc-500">{photoName}</span>
              ) : null}
            </label>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-zinc-900">2. Vertel wat je wilt promoten</h2>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              rows={5}
              data-testid="quick-ad-story"
              placeholder="Bijvoorbeeld: Ik maak zelf taarten in Vlaardingen en wil meer klanten uit mijn buurt bereiken. Maak een warme, professionele Instagram-advertentie waarmee mensen mijn taarten kunnen bestellen."
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none ring-[#006D52] placeholder:text-zinc-400 focus:ring-2"
            />
          </section>

          <section>
            <h2 className="text-sm font-semibold text-zinc-900">Platform (optioneel)</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["instagram", "facebook"] as QuickAdPlatform[]).map((p) => {
                const on = platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                      on
                        ? "bg-[#006D52] text-white"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </section>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {phase === "compose" ? (
            <button
              type="button"
              data-testid="quick-ad-primary-cta"
              onClick={() => void goConfirm()}
              className="w-full rounded-xl bg-[#006D52] px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Maak mijn advertentie
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
              <p className="text-sm font-semibold text-zinc-900">Samenvatting</p>
              <ul className="space-y-1 text-sm text-zinc-700">
                <li>Advertentie · {platforms.map((p) => p[0]!.toUpperCase() + p.slice(1)).join(" + ")}</li>
                <li>Verticaal 9:16 · ±20 sec</li>
                <li>Voorvertoning: gratis (opbouw in Studio)</li>
                <li>
                  Exportkosten:{" "}
                  {creditPreview
                    ? `${creditPreview.requiredCredits} HC`
                    : creditError
                      ? "na inloggen zichtbaar"
                      : "…"}
                </li>
              </ul>
              {creditError ? (
                <p className="text-xs text-amber-800">{creditError}</p>
              ) : null}
              <p className="text-xs text-zinc-600">
                HC wordt gereserveerd bij exporteren via de bestaande Studio-export. Mislukte
                exports volgen de bestaande refund/release.
              </p>
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
                  data-testid="quick-ad-confirm-generate"
                  className="flex-1 rounded-xl bg-[#006D52] px-3 py-2.5 text-sm font-semibold text-white"
                  onClick={() => void runGenerate()}
                >
                  Maak advertentie
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(phase === "generating" || phase === "revising" || phase === "exporting") && (
        <div
          className={`flex min-h-[240px] flex-col items-center justify-center gap-3 ${studioVisual.editorSurface} p-8`}
          data-testid="quick-ad-progress"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#006D52] border-t-transparent" />
          <p className="text-sm font-medium text-zinc-800">{progressLabel}</p>
        </div>
      )}

      {phase === "result" && project && intent && photoUrl ? (
        <div className="space-y-5">
          <ScenePreview imageUrl={photoUrl} scenes={scenes} cta={intent.cta} />
          <div className={`${studioVisual.editorSurface} space-y-2 p-4 text-sm text-zinc-700`}>
            <p>
              <span className="font-semibold text-zinc-900">Toon:</span> {intent.tone}
            </p>
            <p>
              <span className="font-semibold text-zinc-900">CTA:</span> {intent.cta}
            </p>
            <p>
              <span className="font-semibold text-zinc-900">Formaat:</span> 9:16 · ±
              {intent.durationSeconds}s
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900">Pas aan</label>
            <textarea
              value={revisionText}
              onChange={(e) => setRevisionText(e.target.value)}
              rows={3}
              data-testid="quick-ad-revision"
              placeholder='Bijvoorbeeld: "Maak hem korter." of "Zet bestellen duidelijker in beeld."'
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
            <p className="text-xs text-zinc-500" data-testid="quick-ad-revision-cost">
              Deze aanpassing is gratis (voorvertoning). Exporteren kost{" "}
              {creditPreview
                ? creditPreview.requiredCredits === 0
                  ? "niets (gratis)"
                  : `${creditPreview.requiredCredits} HC`
                : "HC volgens Studio-prijslijst"}
              .
            </p>
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
              data-testid="quick-ad-revise"
              disabled={!revisionText.trim()}
              onClick={() => void runGenerate(revisionText.trim())}
              className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Pas aan · gratis
            </button>
            <button
              type="button"
              data-testid="quick-ad-regenerate"
              onClick={() => void runGenerate()}
              className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-800"
            >
              Opnieuw maken · gratis
            </button>
            <button
              type="button"
              data-testid="quick-ad-export"
              onClick={() => void runExport()}
              className="rounded-xl bg-[#006D52] px-4 py-3 text-sm font-semibold text-white sm:col-span-2"
            >
              Exporteren
              {creditPreview
                ? creditPreview.requiredCredits === 0
                  ? " · gratis"
                  : ` · ${creditPreview.requiredCredits} HC`
                : ""}
            </button>
            <Link
              href={QUICK_AD_ADVANCED_EDITOR_PATH(project.id)}
              className="rounded-xl border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-700 sm:col-span-2"
              data-testid="quick-ad-advanced"
            >
              Open geavanceerde editor
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
