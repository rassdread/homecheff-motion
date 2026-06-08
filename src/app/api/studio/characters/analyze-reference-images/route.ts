import { NextResponse } from "next/server";
import { buildCharacterIdentityPrefillFromImages } from "@/lib/studio-character-identity-image-prefill";
import { buildCharacterIdentityPrefillFromPrompt } from "@/lib/studio-character-identity-prompt-prefill";
import { mergeCharacterIdentityPrefills } from "@/lib/studio-character-identity-prefill-merge";
import { requireActiveUser } from "@/server/auth/permissions";
import { analyzeCharacterReferenceImagesWithOpenAi } from "@/server/studio/analyze-character-reference-images";
import { meterOpenAiCharacterAnalysis } from "@/server/provider-cost/studio-cost-metering";
import type { CharacterIdentityImagePrefillInput } from "@/types/studio-character-identity-image-prefill";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: CharacterIdentityImagePrefillInput & { locale?: "en" | "nl" };
  try {
    body = (await request.json()) as CharacterIdentityImagePrefillInput & { locale?: "en" | "nl" };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const imageUrls = (body.imageUrls ?? []).map((u) => u.trim()).filter(Boolean).slice(0, 5);
  if (imageUrls.length === 0) {
    return NextResponse.json(
      { error: "At least one image URL is required.", code: "IMAGE_URLS_REQUIRED" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Character image analysis is not configured.",
        code: "OPENAI_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  const locale = body.locale ?? "en";

  try {
    const model =
      process.env.OPENAI_CHARACTER_IDENTITY_MODEL?.trim() ||
      process.env.OPENAI_VISION_MODEL?.trim() ||
      "gpt-4o-mini";
    const analysis = await analyzeCharacterReferenceImagesWithOpenAi(
      {
        imageUrls,
        imageRoles: body.imageRoles,
        userDescription: body.userDescription,
        intendedUsage: body.intendedUsage,
      },
      apiKey
    );

    meterOpenAiCharacterAnalysis({
      ctx: {
        userId: user.id,
        feature: "character_reference_analysis",
      },
      status: "completed",
      imageCount: imageUrls.length,
      model,
    });

    const imageResult = buildCharacterIdentityPrefillFromImages({
      analysis,
      input: {
        imageUrls,
        imageRoles: body.imageRoles,
        userDescription: body.userDescription,
        intendedUsage: body.intendedUsage,
      },
      locale,
    });

    const promptText = body.userDescription?.trim();
    const promptResult =
      promptText ?
        buildCharacterIdentityPrefillFromPrompt({
          input: {
            prompt: promptText,
            usageContext: body.intendedUsage,
          },
          locale,
        })
      : null;

    const result = mergeCharacterIdentityPrefills({
      prompt: promptResult,
      image: imageResult,
    });

    return NextResponse.json(
      {
        analysis,
        ...result,
      },
      { status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Character image analysis failed.";
    return NextResponse.json({ error: message, code: "ANALYSIS_FAILED" }, { status: 502 });
  }
}
