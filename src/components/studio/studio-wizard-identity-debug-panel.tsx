"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TransformPromptPreview } from "@/lib/studio-asset-transform-prompt";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";

type Props = {
  draft: AssetWizardDraft;
  preview: TransformPromptPreview;
  showFullPrompt?: boolean;
  generatedPrompt?: string | null;
};

export function StudioWizardIdentityDebugPanel({
  draft,
  preview,
  showFullPrompt = false,
  generatedPrompt,
}: Props) {
  const t = useActiveTranslator();
  const vision = draft.sourceVisionAnalysis;
  const fingerprintHash = vision?.identityFingerprint.fingerprintHash;

  return (
    <details className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-zinc-800">
        {t("studio.assetCreation.identityDebug.title")}
      </summary>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.assetCreation.assetVision.brandIdentity")}
          </dt>
          <dd>{preview.brandIdentity || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.assetCreation.assetVision.assetFamily")}
          </dt>
          <dd>{preview.assetFamily || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.assetCreation.identityDebug.fingerprintHash")}
          </dt>
          <dd className="break-all font-mono text-xs">{fingerprintHash || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.assetCreation.transformPrompt.forbiddenLabel")}
          </dt>
          <dd>{preview.forbidden || vision?.suggestedForbidden.join(", ") || "—"}</dd>
        </div>
      </dl>
      {showFullPrompt && (generatedPrompt || preview.compactPrompt) ?
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {t("studio.assetCreation.identityDebug.finalPromptExcerpt")}
          </p>
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-800">
            {(generatedPrompt || preview.compactPrompt).slice(0, 2000)}
          </pre>
        </div>
      : null}
    </details>
  );
}
