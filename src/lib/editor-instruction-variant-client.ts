import type { EditorInstructionSelection } from "@/types/editor-instruction-studio";

export type EditorInstructionVariantApiResponse = {
  ok: boolean;
  resultUrl?: string;
  storageKey?: string;
  provider?: string;
  model?: string;
  costEstimateUsd?: number;
  instruction?: EditorInstructionSelection;
  prompt?: string;
  sourceImageUrl?: string;
  versionNote?: string;
  error?: string;
  code?: string;
};

export async function executeEditorInstructionVariantApi(input: {
  sessionId: string;
  imageUrl: string;
  prompt: string;
  instruction: EditorInstructionSelection;
}): Promise<EditorInstructionVariantApiResponse> {
  const res = await fetch("/api/editor/instruction/variant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });
  return (await res.json()) as EditorInstructionVariantApiResponse;
}
