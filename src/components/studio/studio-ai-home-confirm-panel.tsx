"use client";

import type { StudioIntentPlan } from "@/types/studio-intent-plan";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

export function StudioAiHomeConfirmPanel({
  plan,
  estimatedCredits,
  balanceAfter,
  allowed,
  loading,
  onConfirm,
  onAdjust,
  onAdvanced,
}: {
  plan: StudioIntentPlan;
  estimatedCredits: number | null;
  balanceAfter?: number | null;
  allowed: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onAdjust: () => void;
  onAdvanced: () => void;
}) {
  const t = useActiveTranslator();
  const characters = plan.attachments.filter((a) => a.kind === "character");
  const brands = plan.attachments.filter((a) => a.kind === "brand");
  const products = plan.attachments.filter((a) => a.kind === "product");
  const media = plan.attachments.filter((a) => a.kind === "media");

  return (
    <section
      className={`mt-4 space-y-4 p-4 sm:p-5 ${studioVisual.editorSurface}`}
      data-testid="studio-ai-home-confirm"
      aria-live="polite"
    >
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-zinc-900">{t("studio.aiHome.confirm.title")}</h2>
        <p className="text-base font-medium text-zinc-900" data-testid="studio-ai-home-confirm-summary">
          {plan.summary}
        </p>
      </div>

      <ul className="space-y-1.5 text-sm text-zinc-600">
        {plan.durationSeconds ?
          <li>
            {t("studio.aiHome.confirm.duration")}: {plan.durationSeconds}s
          </li>
        : null}
        {plan.aspectRatio ?
          <li>
            {t("studio.aiHome.confirm.aspect")}: {plan.aspectRatio}
          </li>
        : null}
        {plan.format ?
          <li>
            {t("studio.aiHome.confirm.format")}: {plan.format.replace(/_/g, " ")}
          </li>
        : null}
        {characters.length > 0 ?
          <li>
            {t("studio.aiHome.confirm.character")}: {characters.map((c) => c.name).join(", ")}
            {plan.keepCharacterConsistent ?
              <span className="ml-1 text-xs text-zinc-500">
                ({t("studio.aiHome.character.keepConsistent")})
              </span>
            : null}
          </li>
        : null}
        {products.length > 0 ?
          <li>
            {t("studio.aiHome.confirm.product")}: {products.map((p) => p.name).join(", ")}
          </li>
        : null}
        {brands.length > 0 ?
          <li>
            {t("studio.aiHome.confirm.brand")}: {brands.map((b) => b.name).join(", ")}
          </li>
        : null}
        {media.length > 0 ?
          <li>
            {t("studio.aiHome.confirm.media")}: {media.length}
          </li>
        : null}
        {plan.style ?
          <li>
            {t("studio.aiHome.confirm.style")}: {plan.style}
          </li>
        : null}
      </ul>

      <div className="rounded-xl bg-zinc-50 px-3 py-2 text-sm" data-testid="studio-ai-home-confirm-cost">
        {plan.free ?
          <p className="font-medium text-[#006D52]">{t("studio.aiHome.confirm.free")}</p>
        : estimatedCredits != null ?
          <p className="font-medium text-zinc-900">
            {t("studio.aiHome.confirm.estimatedCost", { credits: String(estimatedCredits) })}
          </p>
        : <p className="text-zinc-600">{t("studio.aiHome.confirm.costPending")}</p>}
        {!plan.free && !allowed ?
          <p className="mt-1 text-sm text-red-700" data-testid="studio-ai-home-insufficient-hc">
            {t("studio.aiHome.confirm.insufficient")}
            {typeof balanceAfter === "number" ?
              ` (${t("studio.aiHome.confirm.balanceAfter", { credits: String(balanceAfter) })})`
            : null}
          </p>
        : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          data-testid="studio-ai-home-confirm-make"
          disabled={loading || (!plan.free && !allowed)}
          onClick={onConfirm}
          className={`min-h-[48px] flex-1 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${studioVisual.btnGradientPrimary}`}
        >
          {loading ? t("studio.aiHome.confirm.loading") : t("studio.aiHome.confirm.make")}
        </button>
        <button
          type="button"
          data-testid="studio-ai-home-confirm-adjust"
          onClick={onAdjust}
          className={`min-h-[48px] flex-1 px-4 py-2.5 text-sm font-semibold ${studioVisual.btnOutline}`}
        >
          {t("studio.aiHome.confirm.adjust")}
        </button>
        <button
          type="button"
          data-testid="studio-ai-home-confirm-advanced"
          onClick={onAdvanced}
          className="min-h-[44px] px-3 text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
        >
          {t("studio.aiHome.confirm.advanced")}
        </button>
      </div>
    </section>
  );
}
