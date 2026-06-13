import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { withStudioCreditGate } from "@/server/studio-account/with-studio-credit-gate";
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
    changePlan?: import("@/types/editor-instruction-studio").EditorInstructionChangePlanItem[];
    references?: EditorInstructionReference[];
    variantName?: string;
    parentVariantId?: string | null;
    confirmed?: boolean;
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
  const changePlan = body.changePlan?.length ? body.changePlan : undefined;

  if (!sessionId || !imageUrl || !prompt || (!normalizedInstruction && !changePlan)) {
    return NextResponse.json(
      {
        error:
          "sessionId, imageUrl, prompt, and instruction or changePlan are required.",
      },
      { status: 400 }
    );
  }

  const instruction =
    normalizedInstruction ??
    (changePlan
      ? {
          objectKey: changePlan[0]!.objectId,
          objectLabel: changePlan[0]!.objectLabel,
          category: changePlan[0]!.objectCategory,
          action: changePlan[0]!.action,
          sliders: {
            ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS,
            changeStrength: changePlan[0]!.strength,
            preserveStyle: changePlan[0]!.preserveStyle,
            brandPreservation: changePlan[0]!.preserveBrand,
          },
        }
      : null);

  if (!instruction) {
    return NextResponse.json({ error: "Invalid instruction payload." }, { status: 400 });
  }

  const gated = await withStudioCreditGate({
    user,
    actionType: "image_generation",
    confirmed: body.confirmed,
    execute: () =>
      executeEditorInstructionVariant({
        userId: user.id,
        sessionId,
        imageUrl,
        prompt,
        instruction,
        references: body.references,
      }),
    isFailure: (result) => !result.ok,
  });

  if ("blocked" in gated) {
    return gated.blocked;
  }

  const result = gated.result;
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
    instruction,
    changePlan: body.changePlan,
    references: body.references,
    prompt,
    sourceImageUrl: imageUrl,
    variantName: body.variantName,
    versionNote:
      body.variantName ??
      (changePlan
        ? `Change plan (${changePlan.length} edits)`
        : `Variant: ${instruction.action} ${instruction.objectLabel}`),
  });
}
