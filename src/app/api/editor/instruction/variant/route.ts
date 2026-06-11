import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { executeEditorInstructionVariant } from "@/server/editor/editor-instruction-variant-service";
import type { EditorInstructionSelection } from "@/types/editor-instruction-studio";
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
    prompt?: string;
    instruction?: Partial<EditorInstructionSelection>;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  const imageUrl = body.imageUrl?.trim();
  const prompt = body.prompt?.trim();
  const instruction = body.instruction;

  if (!sessionId || !imageUrl || !prompt || !instruction?.objectId || !instruction?.action) {
    return NextResponse.json(
      { error: "sessionId, imageUrl, prompt, and instruction.objectId/action are required." },
      { status: 400 }
    );
  }

  const normalizedInstruction: EditorInstructionSelection = {
    objectId: instruction.objectId,
    objectLabel: instruction.objectLabel?.trim() || String(instruction.objectId),
    action: instruction.action,
    replacement: instruction.replacement?.trim(),
    customPrompt: instruction.customPrompt?.trim(),
    sliders: {
      ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS,
      ...instruction.sliders,
    },
    preserveCharacter: instruction.preserveCharacter ?? true,
  };

  const result = await executeEditorInstructionVariant({
    userId: user.id,
    sessionId,
    imageUrl,
    prompt,
    instruction: normalizedInstruction,
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
    prompt,
    sourceImageUrl: imageUrl,
    versionNote: `Variant: ${normalizedInstruction.action} ${normalizedInstruction.objectLabel}`,
  });
}
