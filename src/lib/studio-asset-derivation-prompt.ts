import { buildAssetReferenceGenerationPrompt } from "@/lib/studio-asset-reference-prompt";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

export type DerivationReferencePromptInput = {
  kind: StudioAssetKind;
  summaryPrompt: string;
  choices?: Record<string, string>;
  customTexts?: Record<string, string>;
  styleDna: AssetStyleDna;
  sourceName: string;
};

/** Extends asset reference prompt with style DNA from source reference. */
export function buildDerivationReferenceGenerationPrompt(input: DerivationReferencePromptInput): string {
  const base = buildAssetReferenceGenerationPrompt({
    kind: input.kind,
    summaryPrompt: input.summaryPrompt,
    choices: input.choices,
    customTexts: input.customTexts,
  });

  const dnaBlock = [
    `STYLE DNA from source "${input.sourceName}" (preserve these traits):`,
    input.styleDna.visualStyle ? `Visual style: ${input.styleDna.visualStyle}` : "",
    input.styleDna.colorTheme ? `Color theme: ${input.styleDna.colorTheme}` : "",
    input.styleDna.shapeLanguage ? `Shape language: ${input.styleDna.shapeLanguage}` : "",
    input.styleDna.brandIdentity ? `Brand identity: ${input.styleDna.brandIdentity}` : "",
    input.styleDna.mascotTraits ? `Mascot traits: ${input.styleDna.mascotTraits}` : "",
    input.styleDna.outfitHints ?
      `Reference outfit (adapt for new role, do not copy exactly): ${input.styleDna.outfitHints}`
    : "",
    "Keep recognizable brand continuity from the source reference.",
  ]
    .filter(Boolean)
    .join("\n");

  return `${base}\n\n${dnaBlock}`;
}
