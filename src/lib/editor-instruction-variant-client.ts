import type {
  EditorInstructionChangePlanItem,
  EditorInstructionReference,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";

export type EditorInstructionVariantApiResponse = {
  ok: boolean;
  resultUrl?: string;
  storageKey?: string;
  provider?: string;
  model?: string;
  costEstimateUsd?: number;
  instruction?: EditorInstructionSelection;
  references?: EditorInstructionReference[];
  prompt?: string;
  sourceImageUrl?: string;
  versionNote?: string;
  variantName?: string;
  error?: string;
  code?: string;
};

export async function executeEditorInstructionVariantApi(input: {
  sessionId: string;
  imageUrl: string;
  prompt: string;
  instruction: EditorInstructionSelection;
  changePlan?: EditorInstructionChangePlanItem[];
  references?: EditorInstructionReference[];
  variantName?: string;
  parentVariantId?: string | null;
}): Promise<EditorInstructionVariantApiResponse> {
  const res = await fetch("/api/editor/instruction/variant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });
  return (await res.json()) as EditorInstructionVariantApiResponse;
}

export async function executeEditorInstructionBulkVariantApi(input: {
  sessionId: string;
  imageUrl: string;
  instruction: EditorInstructionSelection;
  references?: EditorInstructionReference[];
  plans: Array<{ id: string; name: string; promptSuffix: string; action?: EditorInstructionSelection["action"] }>;
}): Promise<{ ok: boolean; results: EditorInstructionVariantApiResponse[]; error?: string }> {
  const res = await fetch("/api/editor/instruction/variant/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });
  return (await res.json()) as { ok: boolean; results: EditorInstructionVariantApiResponse[]; error?: string };
}
