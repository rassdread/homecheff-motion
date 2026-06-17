import { NextResponse } from "next/server";
import { buildCharacterIdentityPrefillFromImages } from "@/lib/studio-character-identity-image-prefill";
import { buildCharacterIdentityPrefillFromPrompt } from "@/lib/studio-character-identity-prompt-prefill";
import { mergeCharacterIdentityPrefills } from "@/lib/studio-character-identity-prefill-merge";
import { requireActiveUser } from "@/server/auth/permissions";
import { analyzeCharacterReferenceImagesWithOpenAi } from "@/server/studio/analyze-character-reference-images";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import type { CharacterIdentityImagePrefillInput } from "@/types/studio-character-identity-image-prefill";

type AnalyzeReferenceImagesResult =
  | {
      ok: true;
      analysis: Awaited<ReturnType<typeof analyzeCharacterReferenceImagesWithOpenAi>>;
      merged: ReturnType<typeof mergeCharacterIdentityPrefills>;
    }
  | { ok: false; error: string; code: string; httpStatus: number };

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

  return runBilledProviderRoute({
    user,
    actionType: "vision_analysis",
    execute: async (): Promise<AnalyzeReferenceImagesResult> => {
      try {
        const analysis = await analyzeCharacterReferenceImagesWithOpenAi(
          {
            imageUrls,
            imageRoles: body.imageRoles,
            userDescription: body.userDescription,
            intendedUsage: body.intendedUsage,
          },
          apiKey
        );

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

        const merged = mergeCharacterIdentityPrefills({
          prompt: promptResult,
          image: imageResult,
        });

        return { ok: true, analysis, merged };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Character image analysis failed.";
        return { ok: false, error: message, code: "ANALYSIS_FAILED", httpStatus: 502 };
      }
    },
    isFailure: (result) => !result.ok,
    buildCostEvent: (result) =>
      !result.ok
        ? null
        : {
            provider: "openai",
            costActionType: "openai_vision",
            unitType: "request",
            unitsUsed: Math.max(1, imageUrls.length),
            unitCostUsd: 0.01,
            userId: user.id,
            status: "completed",
            metadataJson: { feature: "character_reference_analysis", imageCount: imageUrls.length },
          },
    onSuccess: (result, estimatedCredits) => {
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, code: result.code },
          { status: result.httpStatus }
        );
      }
      return NextResponse.json(
        withEstimatedCredits(
          {
            analysis: result.analysis,
            ...result.merged,
          },
          estimatedCredits
        ),
        { status: 200 }
      );
    },
  });
}
