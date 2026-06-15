import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { mergeBulkPrompt } from "@/lib/editor-instruction-bulk";
import { buildEditorInstructionPromptV2 } from "@/lib/editor-instruction-prompt-builder";
import { buildVariantRouteValidationError } from "@/lib/editor-instruction-variant-client";
import { receivedKeysFromVariantPayload } from "@/lib/editor-instruction-variant-preflight";
import { validateEditorInstructionVariantRequest } from "@/lib/editor-instruction-variant-validation";
import { executeEditorInstructionVariant } from "@/server/editor/editor-instruction-variant-service";
import type {
  EditorInstructionReference,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    sessionId?: string;
    imageUrl?: string;
    instruction?: Partial<EditorInstructionSelection>;
    references?: EditorInstructionReference[];
    plans?: Array<{
      id: string;
      name: string;
      promptSuffix: string;
      action?: EditorInstructionSelection["action"];
    }>;
    triggerSource?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const receivedKeys = receivedKeysFromVariantPayload({
    sessionId: body.sessionId,
    imageUrl: body.imageUrl,
    instruction: body.instruction,
    triggerSource: body.triggerSource,
  });

  const validation = validateEditorInstructionVariantRequest({
    sessionId: body.sessionId,
    imageUrl: body.imageUrl,
    prompt: body.plans?.[0]?.promptSuffix || "bulk",
    instruction: body.instruction,
  });

  if (!validation.ok) {
    return NextResponse.json(
      buildVariantRouteValidationError({
        validation,
        receivedKeys,
        triggerSource: body.triggerSource,
      }),
      { status: 400 }
    );
  }

  const sessionId = body.sessionId!.trim();
  const imageUrl = body.imageUrl!.trim();
  const plans = body.plans ?? [];
  const instruction = body.instruction;

  if (plans.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "plans are required.",
        code: "missing_instruction",
        missingFields: ["plans"],
        receivedKeys,
        triggerSource: body.triggerSource,
      },
      { status: 400 }
    );
  }

  const baseInstruction: EditorInstructionSelection = {
    objectKey: instruction!.objectKey!,
    objectLabel: instruction!.objectLabel?.trim() || instruction!.objectKey!,
    category: instruction!.category!,
    action: instruction!.action ?? "change_style",
    replacement: instruction!.replacement?.trim(),
    customPrompt: instruction!.customPrompt?.trim(),
    sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS, ...instruction!.sliders },
    preserveCharacter: instruction!.preserveCharacter ?? true,
    logoReferenceId: instruction!.logoReferenceId,
    brandingPlacementHint: instruction!.brandingPlacementHint,
  };

  const basePrompt = buildEditorInstructionPromptV2({
    ...baseInstruction,
    references: body.references,
  });

  const results = [];
  for (const plan of plans) {
    const planInstruction = {
      ...baseInstruction,
      action: plan.action ?? baseInstruction.action,
    };
    const prompt = mergeBulkPrompt(basePrompt, plan);
    const result = await executeEditorInstructionVariant({
      userId: user.id,
      sessionId,
      imageUrl,
      prompt,
      instruction: planInstruction,
      references: body.references,
    });

    if (!result.ok) {
      results.push({ ok: false, error: result.message, code: result.code, variantName: plan.name });
      continue;
    }

    results.push({
      ok: true,
      resultUrl: result.resultUrl,
      storageKey: result.storageKey,
      provider: result.provider,
      model: result.model,
      costEstimateUsd: result.costEstimateUsd,
      instruction: planInstruction,
      references: body.references,
      prompt,
      sourceImageUrl: imageUrl,
      variantName: plan.name,
      versionNote: plan.name,
      presetId: plan.id,
    });
  }

  return NextResponse.json({
    ok: results.some((r) => r.ok),
    results,
    triggerSource: body.triggerSource,
  });
}
