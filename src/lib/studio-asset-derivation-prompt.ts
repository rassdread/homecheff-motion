import { buildAssetReferenceGenerationPrompt } from "@/lib/studio-asset-reference-prompt";
import {
  buildAssetSemanticGenerationContext,
  type AssetSemanticGenerationInput,
} from "@/lib/studio-asset-semantic-generation-context";
import { buildAssetSemanticRecordFromStyleDna } from "@/lib/studio-asset-semantic-record";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

export type DerivationReferencePromptInput = {
  kind: StudioAssetKind;
  summaryPrompt: string;
  choices?: Record<string, string>;
  customTexts?: Record<string, string>;
  styleDna: AssetStyleDna;
  sourceName: string;
  transformLabel?: string;
  preserveHint?: string;
  changeHint?: string;
  forbiddenHint?: string;
  userPrompt?: string;
};

/** Extends asset reference prompt with unified semantic context from source. */
export function buildDerivationReferenceGenerationPrompt(input: DerivationReferencePromptInput): string {
  const semanticInput: AssetSemanticGenerationInput = {
    semanticRecord: buildAssetSemanticRecordFromStyleDna(input.styleDna),
    styleDna: input.styleDna,
    preserveRules: input.preserveHint,
    changeRules: input.changeHint,
    forbiddenRules: input.forbiddenHint,
    userInstruction: input.userPrompt,
  };
  const semanticBlock = buildAssetSemanticGenerationContext(semanticInput);

  const base = buildAssetReferenceGenerationPrompt({
    kind: input.kind,
    summaryPrompt: input.summaryPrompt,
    choices: input.choices,
    customTexts: input.customTexts,
    sourceReference: {
      name: input.sourceName,
      transformLabel: input.transformLabel,
      userPrompt: input.userPrompt,
      preserveHint: input.preserveHint,
      changeHint: input.changeHint,
      forbiddenHint: input.forbiddenHint,
      visionHint: semanticBlock,
    },
  });

  return semanticBlock ? `${semanticBlock}\n\n${base}` : base;
}
