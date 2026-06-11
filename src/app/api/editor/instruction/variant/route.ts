import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { executeEditorInstructionVariant } from "@/server/editor/editor-instruction-variant-service";
import type {
  EditorInstructionReference,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";

export const runtime = "nodejs";

function normalizeInstruction(
  instruction: Partial<EditorInstructionSelection>
): EditorInstructionSelection | null {
  if (!instruction.objectKey || !instruction.category || !instruction.action) {
    return null;
  }
  return {
    objectKey: instruction.objectKey,
    objectLabel: instruction.objectLabel?.trim() || instruction.objectKey,
    category: instruction.category,
    action: instruction.action,
    replacement: instruction.replacement?.trim(),
    customPrompt: instruction.customPrompt?.trim(),
    sliders: {
      ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS,
      ...instruction.sliders,
    },
    preserveCharacter: instruction.preserveCharacter ?? true,
    logoReferenceId: instruction.logoReferenceId,
    styleReferenceId: instruction.styleReferenceId,
    productReferenceId: instruction.productReferenceId,
    brandingPlacementHint: instruction.brandingPlacementHint,
  };
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    sessionId?: string;
    imageUrl?: string;
    prompt?: string;
    instruction?: Partial<EditorInstructionSelection>;
    references?: EditorInstructionReference[];
    variantName?: string;
    parentVariantId?: string | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  const imageUrl = body.imageUrl?.trim();
  const prompt = body.prompt?.trim();
  const normalizedInstruction = body.instruction ? normalizeInstruction(body.instruction) : null;

  if (!sessionId || !imageUrl || !prompt || !normalizedInstruction) {
    return NextResponse.json(
      { error: "sessionId, imageUrl, prompt, and instruction.objectKey/category/action are required." },
      { status: 400 }
    );
  }

  const result = await executeEditorInstructionVariant({
    userId: user.id,
    sessionId,
    imageUrl,
    prompt,
    instruction: normalizedInstruction,
    references: body.references,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.message, code: result.code },
      { status: result.code === "VALIDATION" ? 400 : 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    resultUrl: result.resultUrl,
    storageKey: result.storageKey,
    provider: result.provider,
    model: result.model,
    costEstimateUsd: result.costEstimateUsd,
    instruction: normalizedInstruction,
    references: body.references,
    prompt,
    sourceImageUrl: imageUrl,
    variantName: body.variantName,
    versionNote: body.variantName ?? `Variant: ${normalizedInstruction.action} ${normalizedInstruction.objectLabel}`,
  });
}
