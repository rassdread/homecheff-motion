"use client";

import Image from "next/image";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAnimationWorkflow } from "@/hooks/use-animation-workflow";
import { getActiveTranslator } from "@/i18n";
import { brand } from "@/lib/brand";

export default function AnimatePage() {
  const t = getActiveTranslator();
  const {
    images,
    error,
    projectStatus,
    projectId,
    transitions,
    exportProgress,
    transitionPairs,
    isProcessing,
    canCreateAnimation,
    minImages,
    maxImages,
    handleImageSelection,
    removeImage,
    handleCreateAnimation,
    handleStartOver,
  } = useAnimationWorkflow();

  return (
    <main className={`flex-1 ${brand.softGradientBg}`}>
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-emerald-700">{brand.productName}</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("animate.title")}
        </h1>
        <p className="mt-3 text-zinc-600">
          {t("animate.subtitle")}
        </p>
      </div>

      <AppCard className="mx-auto mt-8 max-w-3xl">
        <label htmlFor="image-upload" className="block text-sm font-semibold">
          {t("animate.upload.label")}
        </label>
        <p className="mt-1 text-sm text-zinc-500">
          {t("animate.upload.help", { max: maxImages })}
        </p>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          multiple
          disabled={isProcessing || images.length >= maxImages}
          onChange={handleImageSelection}
          className="mt-4 block w-full cursor-pointer rounded-xl border border-emerald-100 bg-emerald-50/40 p-2 text-sm file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-500"
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
                <Image
                  src={image.thumbnailPreviewUrl}
                  alt={t("animate.selected.alt", { index: index + 1 })}
                  width={480}
                  height={320}
                  unoptimized
                  className="h-32 w-full object-cover sm:h-36"
                />
                <div className="flex items-center justify-between gap-2 p-3">
                  <p className="truncate text-xs text-zinc-600">
                    {index + 1}. {image.originalFileName}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    disabled={isProcessing}
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
        <div className="mt-3">
          <StatusBadge status={projectStatus} />
        </div>
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
                      <span className="text-xs text-zinc-500">
                        {transition.progress}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all"
                    style={{ width: `${transition.progress}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </AppCard>

      <AppCard className="mx-auto mt-8 max-w-3xl">
        <h2 className="text-lg font-semibold">{t("animate.export.title")}</h2>
        <p className="mt-2 text-sm text-zinc-700">{exportProgress}%</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all"
            style={{ width: `${exportProgress}%` }}
          />
        </div>
      </AppCard>

      {projectStatus === "completed" ? (
        <AppCard className="mx-auto mt-8 max-w-3xl">
          <h2 className="text-lg font-semibold">{t("animate.completed.title")}</h2>
          <div className="mt-4 flex h-44 w-full items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 text-sm text-zinc-500">
            {t("animate.completed.placeholder")}
          </div>
        </AppCard>
      ) : null}

      <div className="mx-auto mt-10 max-w-3xl flex flex-col gap-3 sm:flex-row">
        <GradientButton
          disabled={!canCreateAnimation}
          loading={isProcessing}
          onClick={handleCreateAnimation}
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
