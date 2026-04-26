"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDurationSeconds, getTotalVideoDurationSeconds } from "@/lib/animation-duration";
import {
  getAnimationPreset,
  validateAnimationPresetId,
  type AnimationPresetId,
} from "@/lib/animation-presets";
import { getActiveLocale, getActiveTranslator } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import { useAuthSession } from "@/hooks/use-auth-session";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

function presetTitleKey(presetId: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    basic: "animate.preset.basic.title",
    standard: "animate.preset.standard.title",
    pro: "animate.preset.pro.title",
    smooth: "animate.preset.smooth.title",
  };
  return map[presetId] ?? "animate.preset.standard.title";
}

function intentLabelKey(intent: string | null | undefined): TranslationKey | null {
  if (!intent) {
    return null;
  }
  const allowed = ["morph", "cinematic", "product", "dynamic"] as const;
  if (!(allowed as readonly string[]).includes(intent)) {
    return null;
  }
  return `animate.intent.${intent}` as TranslationKey;
}

function statusLabelKey(status: string): TranslationKey {
  switch (status) {
    case "completed":
      return "videos.status.completed";
    case "generating":
      return "videos.status.generating";
    case "rendering":
      return "videos.status.rendering";
    case "failed":
      return "videos.status.failed";
    default:
      return "videos.status.queued";
  }
}

export default function VideoDetailPage() {
  const t = getActiveTranslator();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const session = useAuthSession();
  const [detail, setDetail] = useState<AnimationProjectDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fragmentsOpen, setFragmentsOpen] = useState(false);

  const dateFmt = useMemo(() => {
    const loc = getActiveLocale() === "nl" ? "nl-NL" : "en-US";
    return new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeStyle: "short" });
  }, []);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/animations/projects/${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      const json: unknown = await res.json().catch(() => null);
      if (res.status === 401) {
        setError(t("errors.authRequired"));
        setDetail(null);
        return;
      }
      if (!res.ok) {
        const msg =
          json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : `HTTP ${res.status}`;
        setError(msg);
        setDetail(null);
        return;
      }
      setDetail(json as AnimationProjectDetailResponse);
    } catch {
      setError(t("videos.error"));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (!session.resolved || !session.user) {
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void load();
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [session.resolved, session.user, load]);

  const finalVideoUrl = useMemo(() => {
    if (!detail?.exports?.length) {
      return null;
    }
    const withUrl = detail.exports.find((e) => e.outputVideoUrl?.trim());
    return withUrl?.outputVideoUrl?.trim() ?? null;
  }, [detail]);

  const latestExport = detail?.exports?.[0] ?? null;

  const durationLabel = useMemo(() => {
    if (!detail) {
      return "—";
    }
    const rawPreset = detail.presetId ?? "";
    const presetId: AnimationPresetId = validateAnimationPresetId(rawPreset) ? rawPreset : "standard";
    const preset = getAnimationPreset(presetId);
    const per =
      detail.advancedSettingsEnabled &&
      detail.viduDurationSeconds != null &&
      detail.viduDurationSeconds > 0
        ? detail.viduDurationSeconds
        : preset.durationSeconds;
    const sec = getTotalVideoDurationSeconds(detail.images.length, per);
    const locale = getActiveLocale() === "nl" ? "nl" : "en";
    return formatDurationSeconds(sec, locale);
  }, [detail]);

  if (!session.resolved) {
    return (
      <main className="mx-auto min-h-[40vh] w-full max-w-3xl px-6 py-10 sm:px-10">
        <div className="h-8 max-w-md animate-pulse rounded-lg bg-zinc-100" aria-hidden />
      </main>
    );
  }

  if (!session.user) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
        <p className="text-sm text-zinc-600">{t("errors.authRequired")}</p>
        <Link href="/login" prefetch={false} className="mt-4 inline-block text-sm font-medium text-emerald-800 underline">
          {t("nav.login")}
        </Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
        <p className="text-sm text-zinc-500">{t("videos.processing")}</p>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
        <p className="text-sm text-red-700">
          {t("videos.error")}: {error ?? "—"}
        </p>
        <Link href="/videos" prefetch={false} className="mt-6 inline-block text-sm font-medium text-zinc-800 underline">
          {t("videos.title")}
        </Link>
      </main>
    );
  }

  const intentKey = intentLabelKey(detail.intent);
  const thumb = detail.images[0]?.previewUrl?.trim() || null;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8 sm:px-10 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/videos" prefetch={false} className="text-sm font-medium text-emerald-800 hover:underline">
          {t("videos.title")}
        </Link>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700">
          {t(statusLabelKey(detail.status))}
        </span>
      </div>

      <h1 className="text-xl font-semibold text-zinc-900">{t("videos.finalVideo")}</h1>

      {detail.ownerEmail ? (
        <p className="mt-2 text-sm text-zinc-600">
          {t("videos.owner")}: <span className="font-medium text-zinc-800">{detail.ownerEmail}</span>
        </p>
      ) : null}

      {finalVideoUrl ? (
        <div className="mt-4 space-y-3">
          <video
            className="w-full max-h-[70vh] rounded-xl bg-black"
            controls
            playsInline
            preload="none"
            poster={thumb ?? undefined}
            src={finalVideoUrl}
          />
          <div className="flex flex-wrap gap-2">
            <a
              href={finalVideoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
            >
              {t("videos.download")}
            </a>
            <a
              href={finalVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              {t("videos.open")}
            </a>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">{t("videos.downloadHint")}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-600">{t("videos.processing")}</p>
      )}

      <section className="mt-10 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{t("projectDetail.meta.createdAt")}</h2>
        <p className="text-sm text-zinc-800">{dateFmt.format(new Date(detail.createdAt))}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">{t("videos.preset")}</dt>
          <dd className="text-right font-medium text-zinc-900">{t(presetTitleKey(detail.presetId ?? "standard"))}</dd>
          {intentKey ? (
            <>
              <dt className="text-zinc-500">{t("videos.intent")}</dt>
              <dd className="text-right font-medium text-zinc-900">{t(intentKey)}</dd>
            </>
          ) : null}
          <dt className="text-zinc-500">{t("videos.duration")}</dt>
          <dd className="text-right font-medium text-zinc-900">{durationLabel}</dd>
          <dt className="text-zinc-500">{t("videos.credits")}</dt>
          <dd className="text-right font-medium text-zinc-900">
            {detail.estimatedCredits != null ? String(detail.estimatedCredits) : "—"}
          </dd>
        </dl>
        {detail.userPrompt?.trim() ? (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("animate.prompt.label")}
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{detail.userPrompt.trim()}</p>
          </div>
        ) : null}
      </section>

      {latestExport && (latestExport.status === "failed" || latestExport.errorMessage?.trim()) ? (
        <section className="mt-8 rounded-lg border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">{t("projectDetail.export.title")}</p>
          <p className="mt-1">{t("videos.status.failed")}</p>
          {latestExport.errorMessage?.trim() ? (
            <p className="mt-2 font-mono text-xs text-red-800/90">{latestExport.errorMessage.trim()}</p>
          ) : null}
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900">{t("projectDetail.images.title")}</h2>
        {detail.images.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">{t("projectDetail.images.empty")}</p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {detail.images.map((img) => (
              <li key={img.id} className="overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
                {img.previewUrl?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.previewUrl.trim()}
                    alt={img.fileName}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center p-2 text-center text-xs text-zinc-400">
                    {img.fileName}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <details
        className="mt-10 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4"
        onToggle={(e) => setFragmentsOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-sm font-semibold text-zinc-900">{t("videos.fragments")}</summary>
        <ul className="mt-4 space-y-4">
          {detail.transitions.length === 0 ? (
            <li className="text-sm text-zinc-600">{t("projectDetail.transitions.empty")}</li>
          ) : (
            detail.transitions.map((tr) => (
              <li key={tr.id} className="rounded-lg border border-zinc-100 bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-zinc-800">
                    #{tr.order + 1} · {t(statusLabelKey(tr.status))}
                  </span>
                  <span className="tabular-nums text-zinc-500">{tr.progress}%</span>
                </div>
                {fragmentsOpen && tr.outputVideoUrl?.trim() ? (
                  <video
                    className="mt-3 w-full max-w-md rounded-md bg-black"
                    controls
                    playsInline
                    preload="none"
                    src={tr.outputVideoUrl.trim()}
                  />
                ) : null}
                {tr.errorMessage?.trim() ? (
                  <p className="mt-2 text-xs text-red-700">{tr.errorMessage.trim()}</p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </details>

      <div className="mt-10">
        <Link
          href="/animate"
          prefetch={false}
          className="inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-emerald-50"
        >
          {t("videos.createNew")}
        </Link>
      </div>
    </main>
  );
}
