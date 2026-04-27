"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimationIntentPreviewCard } from "@/components/animate/animation-intent-preview-card";
import { AnimateEstimateCard } from "@/components/animate/animate-estimate-card";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAnimationWorkflow } from "@/hooks/use-animation-workflow";
import { getActiveTranslator, type TranslationKey } from "@/i18n";
import { getTotalVideoDurationSeconds, getTransitionCount } from "@/lib/animation-duration";
import {
  ANIMATION_INTENTS,
  ANIMATION_INTENT_IDS,
  type AnimationIntentId,
} from "@/lib/animation-intents";
import {
  ANIMATION_PRESETS,
  MAX_ANIMATION_USER_PROMPT_LENGTH,
  type AnimationPresetId,
} from "@/lib/animation-presets";
import { brand } from "@/lib/brand";

const INTENT_LABEL_KEYS: Record<AnimationIntentId, TranslationKey> = {
  morph: "animate.intent.morph",
  cinematic: "animate.intent.cinematic",
  product: "animate.intent.product",
  dynamic: "animate.intent.dynamic",
};

const PRESET_LABELS: Record<
  AnimationPresetId,
  { title: TranslationKey; description: TranslationKey }
> = {
  basic: {
    title: "animate.preset.basic.title",
    description: "animate.preset.basic.description",
  },
  standard: {
    title: "animate.preset.standard.title",
    description: "animate.preset.standard.description",
  },
  smooth: {
    title: "animate.preset.smooth.title",
    description: "animate.preset.smooth.description",
  },
  pro: {
    title: "animate.preset.pro.title",
    description: "animate.preset.pro.description",
  },
};

export default function AnimatePage() {
  const t = getActiveTranslator();
  const authSession = useAuthSession();
  const {
    images,
    error,
    projectStatus,
    projectId,
    transitions,
    exportProgress,
    exportProvider,
    displayExportProgress,
    overallProgress,
    displayOverallProgress,
    generationStageKey,
    isPersistingAnimation,
    pollLastUpdatedAt,
    retryJobsBusy,
    retryPollBusy,
    retryExportPollBusy,
    anyTransitionFailed,
    transitionPairs,
    isProcessing,
    canCreateAnimation,
    minImages,
    maxImages,
    selectedPresetId,
    setSelectedPresetId,
    selectedIntent,
    setSelectedIntent,
    suggestedIntent,
    intentManuallyChanged,
    setIntentManuallyChanged,
    userPrompt,
    setUserPrompt,
    estimatedProjectCredits,
    estimatedProjectUsd,
    presetLimitMessage,
    isAuthenticated,
    isAuthResolved,
    usage,
    usageError,
    accountInactive,
    visiblePresetIds,
    jobsStartError,
    pollError,
    finalProjectVideoUrl,
    exportPhaseError,
    exportPollError,
    handleImageSelection,
    removeImage,
    handleCreateAnimation,
    handleStartOver,
    retryStartJobs,
    retryPoll,
    retryExportPoll,
    retryExportMerge,
    cancelExportBusy,
    postExportCancel,
    canUseAdvancedAnimationControls,
    advancedLimits,
    advancedMode,
    handleAdvancedModeChange,
    advancedModel,
    setAdvancedModel,
    advancedResolution,
    setAdvancedResolution,
    advancedDuration,
    setAdvancedDuration,
    useAdvancedOverrides,
    activePreset,
  } = useAnimationWorkflow();

  const imageUploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (images.length === 0 && imageUploadInputRef.current) {
      imageUploadInputRef.current.value = "";
    }
  }, [images.length]);

  const [targetTotalFocused, setTargetTotalFocused] = useState(false);
  const [targetTotalEditDraft, setTargetTotalEditDraft] = useState("");
  const [showStuckExportCancel, setShowStuckExportCancel] = useState(false);
  const [exportCancelFeedback, setExportCancelFeedback] = useState<string | null>(null);

  const secondsPerTransitionForUi = useAdvancedOverrides
    ? advancedDuration
    : activePreset.durationSeconds;

  const targetTotalInputValue =
    !useAdvancedOverrides || !advancedLimits || images.length < 2
      ? ""
      : targetTotalFocused
        ? targetTotalEditDraft
        : String(getTotalVideoDurationSeconds(images.length, advancedDuration));

  const canRetryExportMerge =
    projectStatus === "failed" && !anyTransitionFailed;

  useEffect(() => {
    if (
      projectStatus !== "rendering" ||
      anyTransitionFailed ||
      finalProjectVideoUrl ||
      !projectId
    ) {
      const resetId = window.setTimeout(() => setShowStuckExportCancel(false), 0);
      return () => window.clearTimeout(resetId);
    }
    const timer = window.setTimeout(() => setShowStuckExportCancel(true), 30_000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [projectStatus, anyTransitionFailed, finalProjectVideoUrl, projectId]);

  if (!isAuthResolved) {
    return (
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <AppCard>
            <p className="text-sm text-zinc-600">{t("animate.auth.loading")}</p>
          </AppCard>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <AppCard>
            <h1 className="text-2xl font-semibold">{t("animate.auth.requiredTitle")}</h1>
            <p className="mt-2 text-zinc-600">{t("animate.auth.requiredDescription")}</p>
            <div className="mt-6 flex gap-3">
              <GradientButton href="/login">{t("animate.auth.loginCta")}</GradientButton>
              <Link
                href="/signup"
                className="rounded-full border border-emerald-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-emerald-50"
              >
                {t("animate.auth.signupCta")}
              </Link>
            </div>
            <p className="mt-4 text-xs text-zinc-500">{t("animate.auth.inviteSignupHint")}</p>
          </AppCard>
        </div>
      </main>
    );
  }

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
        {authSession.resolved && authSession.user ? (
          <div
            className="mx-auto mb-5 max-w-3xl rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-sm sm:px-4 sm:text-sm"
            role="status"
          >
            {authSession.user.role === "admin"
              ? t("animate.mode.admin")
              : authSession.user.role === "power"
                ? t("animate.mode.power")
                : t("animate.mode.user")}
          </div>
        ) : null}
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-emerald-700">{brand.productName}</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("animate.title")}
        </h1>
        <p className="mt-3 text-zinc-600">
          {t("animate.subtitle")}
        </p>
      </div>

      {accountInactive ? (
        <AppCard className="mx-auto mt-8 max-w-3xl border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-800">{t("animate.auth.inactiveAccount")}</p>
        </AppCard>
      ) : null}

      <AppCard className="mx-auto mt-8 max-w-3xl">
        <h2 className="text-lg font-semibold">{t("animate.preset.title")}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t("animate.preset.hint")}</p>
        {images.length < 2 ? (
          <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 sm:text-sm">
            {t("animate.estimate.needTwoForCalc")}
          </p>
        ) : null}
        {usage ? (
          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-zinc-700">
            <p>
              {t("animate.usage.dailyRemainingVideos", {
                remaining: usage.remaining.dailyVideosRemaining,
                limit: usage.limits.maxVideosPerDay,
              })}
            </p>
            <p className="mt-1">
              {t("animate.usage.dailyRemainingCredits", {
                remaining: usage.remaining.dailyCreditsRemaining,
                limit: usage.limits.maxEstimatedCreditsPerDay,
              })}
            </p>
            {usage.remaining.dailyVideosRemaining <= 1 ||
            usage.remaining.dailyCreditsRemaining <= 100 ? (
              <p className="mt-2 text-amber-700">{t("animate.usage.nearLimit")}</p>
            ) : null}
            {usage.remaining.dailyVideosRemaining <= 0 ||
            usage.remaining.dailyCreditsRemaining <= 0 ? (
              <p className="mt-2 text-red-700">{t("animate.usage.blocked")}</p>
            ) : null}
          </div>
        ) : null}
        {usageError ? <p className="mt-2 text-xs text-amber-700">{usageError}</p> : null}
        <fieldset disabled={isProcessing} className="mt-4 space-y-3">
          <legend className="sr-only">{t("animate.preset.title")}</legend>
          {visiblePresetIds.map((presetId) => {
            const def = ANIMATION_PRESETS[presetId];
            const labels = PRESET_LABELS[presetId];
            return (
              <label
                key={presetId}
                className={`flex cursor-pointer gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  selectedPresetId === presetId
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-emerald-100 bg-white hover:border-emerald-200"
                }`}
              >
                <input
                  type="radio"
                  name="animation-preset"
                  value={presetId}
                  checked={selectedPresetId === presetId}
                  onChange={() => setSelectedPresetId(presetId)}
                  className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-900">
                    {t(labels.title)}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-600">
                    {t(labels.description)}
                  </span>
                  <AnimateEstimateCard
                    t={t}
                    mode="preset"
                    imageCount={images.length}
                    secondsPerTransition={def.durationSeconds}
                    creditsPerSecond={def.estimatedCreditsPerSecond}
                    maxCredits={def.estimatedMaxCredits}
                    maxUsd={def.estimatedMaxUsd}
                    resolution={def.resolution}
                    maxImages={def.maxImages}
                    maxTransitions={def.maxTransitions}
                    compact
                  />
                </span>
              </label>
            );
          })}
        </fieldset>
        <div
          className="mt-4"
          role="group"
          aria-labelledby="animation-intent-preview-heading"
        >
          <p
            id="animation-intent-preview-heading"
            className="text-sm font-medium text-zinc-700"
          >
            {t("animate.intent.previewTitle")}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{t("animate.intent.previewHint")}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-3">
            {ANIMATION_INTENT_IDS.map((intentId) => (
              <AnimationIntentPreviewCard
                key={intentId}
                intentId={intentId}
                selected={selectedIntent === intentId}
                onSelect={() => {
                  setIntentManuallyChanged(true);
                  setSelectedIntent(intentId);
                }}
                label={t(INTENT_LABEL_KEYS[intentId])}
                description={t(ANIMATION_INTENTS[intentId].descriptionKey)}
                showSuggestedBadge={
                  images.length >= minImages &&
                  !intentManuallyChanged &&
                  suggestedIntent === intentId
                }
                suggestedBadgeText={t("animate.intent.suggestedBadge")}
                disabled={isProcessing || accountInactive}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
            {t("animate.intent.pickerTip")}
          </p>
          {images.length >= minImages ? (
            <p className="mt-2 text-xs text-zinc-500">
              {intentManuallyChanged
                ? t("animate.intent.manual")
                : suggestedIntent
                  ? t("animate.intent.suggested", {
                      style: t(INTENT_LABEL_KEYS[suggestedIntent]),
                    })
                  : t("animate.intent.auto")}
            </p>
          ) : null}
        </div>
        {presetLimitMessage ? (
          <p className="mt-3 text-sm text-amber-800">{presetLimitMessage}</p>
        ) : null}

        {canUseAdvancedAnimationControls && advancedLimits ? (
          <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
            <h3 className="text-sm font-semibold text-violet-900">{t("animate.advanced.title")}</h3>
            <p className="mt-1 text-xs text-violet-800/90">{t("animate.advanced.description")}</p>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={advancedMode}
                onChange={(e) => {
                  const next = e.target.checked;
                  if (!next) {
                    setTargetTotalFocused(false);
                  }
                  handleAdvancedModeChange(next);
                }}
                disabled={isProcessing || accountInactive}
                className="h-4 w-4 rounded border-violet-300 text-violet-700 accent-violet-600"
              />
              {t("animate.advanced.toggle")}
            </label>
            {advancedMode ? (
              <div className="mt-4 space-y-4 text-sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="adv-model" className="block text-xs font-medium text-zinc-700">
                      {t("animate.advanced.model")}
                    </label>
                    <select
                      id="adv-model"
                      value={advancedModel}
                      onChange={(e) => setAdvancedModel(e.target.value)}
                      disabled={isProcessing || accountInactive}
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                    >
                      {advancedLimits.allowedModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="adv-resolution"
                      className="block text-xs font-medium text-zinc-700"
                    >
                      {t("animate.advanced.resolution")}
                    </label>
                    <select
                      id="adv-resolution"
                      value={advancedResolution}
                      onChange={(e) =>
                        setAdvancedResolution(e.target.value as "540p" | "720p" | "1080p")
                      }
                      disabled={isProcessing || accountInactive}
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                    >
                      {advancedLimits.allowedResolutions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="adv-duration" className="block text-xs font-medium text-zinc-700">
                      {t("animate.transformation.fieldSeconds")}
                    </label>
                    <input
                      id="adv-duration"
                      type="number"
                      min={1}
                      max={advancedLimits.maxDurationSeconds}
                      value={advancedDuration}
                      onChange={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        if (Number.isFinite(n)) {
                          setAdvancedDuration(
                            Math.min(
                              Math.max(1, n),
                              advancedLimits.maxDurationSeconds
                            )
                          );
                        }
                      }}
                      disabled={isProcessing || accountInactive}
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <AnimateEstimateCard
                  mode="advanced"
                  t={t}
                  imageCount={images.length}
                  secondsPerTransition={advancedDuration}
                  creditsPerSecond={1}
                  maxCredits={0}
                  maxUsd={0}
                  resolution={advancedResolution}
                  maxImages={advancedLimits.maxImages}
                  maxTransitions={advancedLimits.maxTransitions}
                  currentCreditsOverride={estimatedProjectCredits}
                  currentUsdOverride={estimatedProjectUsd}
                  showExplanation
                />
                {useAdvancedOverrides ? (
                  <div className="space-y-1 border-t border-violet-100 pt-3">
                    <p className="text-xs font-semibold text-violet-900">
                      {t("animate.estimate.targetTotalOr")}
                    </p>
                    <label htmlFor="adv-target-total" className="sr-only">
                      {t("animate.duration.targetTotal")}
                    </label>
                    <input
                      id="adv-target-total"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={targetTotalInputValue}
                      placeholder={
                        images.length < 2 ? t("animate.estimate.targetTotalDisabled") : ""
                      }
                      onFocus={() => {
                        if (images.length < 2 || !advancedLimits) {
                          return;
                        }
                        setTargetTotalFocused(true);
                        setTargetTotalEditDraft(
                          String(getTotalVideoDurationSeconds(images.length, advancedDuration))
                        );
                      }}
                      onChange={(e) => setTargetTotalEditDraft(e.target.value)}
                      onBlur={() => {
                        const tc = getTransitionCount(images.length);
                        if (tc < 1 || !advancedLimits) {
                          if (images.length >= 2) {
                            setTargetTotalEditDraft(
                              String(
                                getTotalVideoDurationSeconds(images.length, advancedDuration)
                              )
                            );
                          } else {
                            setTargetTotalEditDraft("");
                          }
                          setTargetTotalFocused(false);
                          return;
                        }
                        const raw = Number.parseInt(targetTotalEditDraft, 10);
                        if (!Number.isFinite(raw) || raw < 1) {
                          setTargetTotalEditDraft(
                            String(getTotalVideoDurationSeconds(images.length, advancedDuration))
                          );
                          setTargetTotalFocused(false);
                          return;
                        }
                        const per = Math.round(raw / tc);
                        const clamped = Math.min(
                          Math.max(1, per),
                          advancedLimits.maxDurationSeconds
                        );
                        setAdvancedDuration(clamped);
                        setTargetTotalFocused(false);
                      }}
                      disabled={
                        images.length < 2 || isProcessing || accountInactive || !advancedLimits
                      }
                      className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-zinc-50"
                    />
                    <p className="text-xs text-zinc-500">{t("animate.estimate.targetTotalHintAuto")}</p>
                  </div>
                ) : null}
                {useAdvancedOverrides && estimatedProjectCredits > 500 ? (
                  <p className="text-xs font-medium text-amber-800">
                    {t("animate.advanced.highCreditsWarning")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="mt-4 text-xs text-zinc-500">{t("animate.preset.estimateNote")}</p>

        <div className="mt-6">
          <label htmlFor="animation-user-prompt" className="block text-sm font-medium text-zinc-700">
            {t("animate.prompt.label")}
          </label>
          <textarea
            id="animation-user-prompt"
            value={userPrompt}
            onChange={(e) =>
              setUserPrompt(e.target.value.slice(0, MAX_ANIMATION_USER_PROMPT_LENGTH))
            }
            maxLength={MAX_ANIMATION_USER_PROMPT_LENGTH}
            rows={3}
            disabled={isProcessing || accountInactive}
            placeholder={t("animate.prompt.placeholder")}
            className="mt-2 block w-full resize-y rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-zinc-500">{t("animate.prompt.hint")}</p>
        </div>
      </AppCard>

      <AppCard className="mx-auto mt-8 max-w-3xl">
        <label htmlFor="image-upload" className="block text-sm font-semibold">
          {t("animate.upload.label")}
        </label>
        <p className="mt-1 text-sm text-zinc-500">
          {t("animate.upload.help", { max: maxImages })}
        </p>
        <input
          ref={imageUploadInputRef}
          id="image-upload"
          type="file"
          accept="image/*"
          multiple
          disabled={isProcessing || images.length >= maxImages}
          onChange={handleImageSelection}
          className="mt-4 block w-full cursor-pointer rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-sm file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-500"
        />

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        {!canCreateAnimation ? (
          <p className="mt-3 text-sm text-amber-700">
            {t("animate.upload.minWarning", { min: minImages })}
          </p>
        ) : null}
      </AppCard>

      <section className="mx-auto mt-8 max-w-3xl">
        <h2 className="text-lg font-semibold">
          {t("animate.selected.title", { count: images.length })}
        </h2>
        {images.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">{t("animate.selected.empty")}</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {images.map((image, index) => (
              <article
                key={image.id}
                className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_12px_30px_-20px_rgba(16,185,129,0.45)]"
              >
                {/* Blob previews + revokeObjectURL; native img avoids next/image caching issues */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.thumbnailPreviewUrl}
                  alt={t("animate.selected.alt", { index: index + 1 })}
                  width={480}
                  height={320}
                  decoding="async"
                  className="h-32 w-full object-cover sm:h-36"
                />
                <div className="flex items-center justify-between gap-2 p-3">
                  <p className="truncate text-xs text-zinc-600">
                    {index + 1}. {image.originalFileName}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    disabled={isProcessing || isPersistingAnimation}
                    className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("animate.selected.remove")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto mt-8 max-w-3xl">
        <h2 className="text-lg font-semibold">{t("animate.transitions.orderedTitle")}</h2>
        {transitionPairs.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            {t("animate.transitions.orderedEmpty")}
          </p>
        ) : (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
            {transitionPairs.map((pair) => (
              <li key={pair}>{pair}</li>
            ))}
          </ol>
        )}
      </section>

      <AppCard className="mx-auto mt-8 max-w-3xl">
        <h2 className="text-lg font-semibold">{t("animate.status.title")}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusBadge status={projectStatus} />
          {transitions.length > 0 ? (
            <span className="text-sm text-zinc-600">
              {t("animate.overallProgress")}: {displayOverallProgress}%
            </span>
          ) : null}
        </div>
        {transitions.length > 0 && (projectStatus === "generating" || projectStatus === "rendering") ? (
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500 ${
                  overallProgress === 0 && (projectStatus === "generating" || projectStatus === "rendering")
                    ? "animate-pulse"
                    : ""
                }`}
                style={{ width: `${displayOverallProgress}%` }}
              />
            </div>
          </div>
        ) : null}
        {generationStageKey ? (
          <p className="mt-3 text-sm font-medium text-zinc-800">{t(generationStageKey)}</p>
        ) : null}
        {isProcessing && pollLastUpdatedAt ? (
          <p className="mt-1 text-xs text-zinc-500">
            {t("animate.progress.lastUpdated", {
              time: new Date(pollLastUpdatedAt).toLocaleTimeString(),
            })}
          </p>
        ) : null}
        {isProcessing ? (
          <p className="mt-2 text-xs text-amber-900/80">{t("animate.progress.keepWindowOpen")}</p>
        ) : null}
        {jobsStartError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p>{jobsStartError}</p>
            <button
              type="button"
              onClick={() => void retryStartJobs()}
              disabled={retryJobsBusy}
              className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retryJobsBusy ? t("animate.retry.busy") : t("animate.retryJobsStart")}
            </button>
          </div>
        ) : null}
        {pollError ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            <p>{pollError}</p>
            <button
              type="button"
              onClick={() => void retryPoll()}
              disabled={retryPollBusy}
              className="mt-3 rounded-lg bg-amber-800 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retryPollBusy ? t("animate.retry.busy") : t("animate.retryPoll")}
            </button>
          </div>
        ) : null}
        {exportPollError ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            <p>{exportPollError}</p>
            <button
              type="button"
              onClick={() => void retryExportPoll()}
              disabled={retryExportPollBusy}
              className="mt-3 rounded-lg bg-amber-800 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retryExportPollBusy ? t("animate.retry.busy") : t("animate.export.retryPoll")}
            </button>
          </div>
        ) : null}
        {projectId && showStuckExportCancel && projectStatus === "rendering" ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800">
            <button
              type="button"
              disabled={cancelExportBusy}
              onClick={() => {
                if (!window.confirm(t("animate.export.cancelConfirm"))) {
                  return;
                }
                setExportCancelFeedback(null);
                void (async () => {
                  const result = await postExportCancel(projectId);
                  if (!result.ok) {
                    setExportCancelFeedback(result.error ?? t("animate.export.cancelFailed"));
                  }
                })();
              }}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelExportBusy ? t("animate.retry.busy") : t("animate.export.cancel")}
            </button>
            {exportCancelFeedback ? (
              <p className="mt-2 text-xs text-red-700">{exportCancelFeedback}</p>
            ) : null}
          </div>
        ) : null}
        {exportPhaseError &&
        projectStatus !== "generating" &&
        projectStatus !== "rendering" ? (
          <p className="mt-3 text-sm text-red-700">
            {exportPhaseError.toLowerCase().includes("cancelled")
              ? t("animate.export.cancelled")
              : exportPhaseError}
          </p>
        ) : null}
        {canRetryExportMerge ? (
          <button
            type="button"
            onClick={() => void retryExportMerge()}
            className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800"
          >
            {t("animate.export.retryMerge")}
          </button>
        ) : null}
        {anyTransitionFailed ? (
          <p className="mt-3 text-sm font-medium text-red-700">
            {t("status.failed")} — {t("animate.transitionError")}
          </p>
        ) : null}
        {projectStatus === "failed" && !anyTransitionFailed ? (
          <p className="mt-3 text-sm font-medium text-red-700">{t("status.failed")}</p>
        ) : null}
      </AppCard>

      <AppCard className="mx-auto mt-8 max-w-3xl">
        <h2 className="text-lg font-semibold">{t("animate.transitions.progressTitle")}</h2>
        {transitions.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            {t("animate.transitions.progressEmpty")}
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {transitions.map((transition) => (
              <li key={transition.id} className="rounded-2xl border border-emerald-100 p-3">
                <div className="flex items-center gap-3">
                  <Image
                    src={transition.startPreviewUrl}
                    alt={transition.startImageName}
                    width={80}
                    height={80}
                    unoptimized
                    className="h-14 w-14 rounded-md object-cover"
                  />
                  <span className="text-xs text-zinc-500">{"->"}</span>
                  <Image
                    src={transition.endPreviewUrl}
                    alt={transition.endImageName}
                    width={80}
                    height={80}
                    unoptimized
                    className="h-14 w-14 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800">
                      {transition.startImageName} {"->"} {transition.endImageName}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={transition.status} />
                      <span className="text-xs text-zinc-500">{transition.progress}%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500 ${
                      (transition.status === "queued" || transition.status === "generating") &&
                      transition.progress === 0
                        ? "animate-pulse"
                        : ""
                    }`}
                    style={{
                      width: `${Math.max(
                        transition.progress,
                        transition.status === "queued" || transition.status === "generating"
                          ? 8
                          : 0
                      )}%`,
                    }}
                  />
                </div>
                {transition.errorMessage ? (
                  <p className="mt-2 text-xs text-red-600">{transition.errorMessage}</p>
                ) : null}
                {transition.outputVideoUrl ? (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium text-zinc-600">
                      {t("animate.transitionVideo")}
                    </p>
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-48 w-full rounded-lg border border-zinc-200 bg-black"
                    >
                      <source src={transition.outputVideoUrl} type="video/mp4" />
                    </video>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AppCard>

      <AppCard className="mx-auto mt-8 max-w-3xl">
        <h2 className="text-lg font-semibold">{t("animate.export.title")}</h2>
        {projectStatus === "rendering" ? (
          <p className="mt-2 text-sm text-zinc-600">
            {exportProvider === "external-ffmpeg"
              ? t("animate.export.externalMerging")
              : t("animate.export.merging")}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-zinc-700">{displayExportProgress}%</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className={`h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500 ${
              projectStatus === "rendering" && exportProgress === 0 ? "animate-pulse" : ""
            }`}
            style={{ width: `${displayExportProgress}%` }}
          />
        </div>
      </AppCard>

      {projectStatus === "rendering" ? (
        <AppCard className="mx-auto mt-8 max-w-3xl">
          <h2 className="text-lg font-semibold">
            {exportProvider === "external-ffmpeg"
              ? t("animate.export.externalMerging")
              : t("animate.export.merging")}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            {exportProvider === "external-ffmpeg"
              ? t("animate.progress.stageMergingExternal")
              : t("animate.rendering.mergePending")}
          </p>
        </AppCard>
      ) : null}
      {projectStatus === "completed" ? (
        <AppCard className="mx-auto mt-8 max-w-3xl">
          <h2 className="text-lg font-semibold">{t("animate.completed.title")}</h2>
          {finalProjectVideoUrl ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-zinc-600">
                {t("animate.export.finalVideo")}
              </p>
              <video
                controls
                playsInline
                preload="metadata"
                className="max-h-64 w-full rounded-xl border border-zinc-200 bg-black"
              >
                <source src={finalProjectVideoUrl} type="video/mp4" />
              </video>
            </div>
          ) : (
            <div className="mt-4 flex h-44 w-full items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 text-sm text-zinc-500">
              {t("animate.completed.placeholder")}
            </div>
          )}
        </AppCard>
      ) : null}

      <AnimateEstimateCard
        mode="final"
        t={t}
        imageCount={images.length}
        secondsPerTransition={secondsPerTransitionForUi}
        creditsPerSecond={activePreset.estimatedCreditsPerSecond}
        maxCredits={activePreset.estimatedMaxCredits}
        maxUsd={activePreset.estimatedMaxUsd}
        resolution={activePreset.resolution}
        maxImages={activePreset.maxImages}
        maxTransitions={activePreset.maxTransitions}
        currentCreditsOverride={useAdvancedOverrides ? estimatedProjectCredits : undefined}
        currentUsdOverride={useAdvancedOverrides ? estimatedProjectUsd : undefined}
        className="mx-auto mt-8 max-w-3xl"
      />
      <div className="mx-auto mt-10 max-w-3xl flex flex-col gap-3 sm:flex-row">
        <GradientButton
          disabled={!canCreateAnimation}
          loading={isProcessing || isPersistingAnimation}
          loadingLabel={
            isPersistingAnimation
              ? t("animate.button.persisting")
              : isProcessing
                ? t("animate.button.processing")
                : undefined
          }
          onClick={() => void handleCreateAnimation()}
          className="w-full"
        >
          {t("animate.button.create")}
        </GradientButton>
        <button
          type="button"
          onClick={handleStartOver}
          className="w-full rounded-full border border-emerald-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-emerald-50"
        >
          {t("animate.button.startOver")}
        </button>
      </div>
      {projectId ? (
        <div className="mx-auto mt-4 max-w-3xl">
          <GradientButton href={`/animate/${projectId}`} className="w-full">
            {t("animate.button.openSavedProject")}
          </GradientButton>
        </div>
      ) : null}
      </div>
    </main>
  );
}
