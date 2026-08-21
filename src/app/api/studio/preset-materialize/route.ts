import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { buildPresetProductionContext } from "@/lib/studio-preset-production-context";
import { materializePresetIntoStudioProject } from "@/server/studio/studio-preset-materialization";
import type { StudioPresetRoleTaggedAsset } from "@/types/studio-preset-production-context";
import type { StudioPresetSourceType } from "@/types/studio-preset-production-context";

type MaterializeBody = {
  sourceType: StudioPresetSourceType;
  sourceId: string;
  displayTitle?: string | null;
  userIntent?: string | null;
  assets?: StudioPresetRoleTaggedAsset[];
  returnUrl?: string | null;
  homecheffItemId?: string | null;
  homecheffItemType?: string | null;
  growthLeadId?: string | null;
  sourceQuickProjectId?: string | null;
  styleHints?: string[];
  worldHints?: string[];
  motionHints?: string[];
};

const SOURCE_TYPES = new Set<string>([
  "EXPERIENCE_PACK",
  "MOTION_PRESET",
  "FUSION_WIZARD",
  "MORPH_ACTION",
  "CHARACTER_STUDIO",
  "DIRECTOR",
  "HOMECHEFF",
  "LEGACY",
]);

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: MaterializeBody;
  try {
    body = (await request.json()) as MaterializeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  if (!body?.sourceType || !SOURCE_TYPES.has(body.sourceType) || !body.sourceId?.trim()) {
    return NextResponse.json(
      { error: "sourceType and sourceId are required.", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const context = buildPresetProductionContext({
    sourceType: body.sourceType,
    sourceId: body.sourceId.trim(),
    displayTitle: body.displayTitle,
    userIntent: body.userIntent,
    assets: body.assets ?? [],
    returnUrl: body.returnUrl,
    homecheffItemId: body.homecheffItemId,
    homecheffItemType: body.homecheffItemType,
    growthLeadId: body.growthLeadId,
    sourceQuickProjectId: body.sourceQuickProjectId,
    styleHints: body.styleHints,
    worldHints: body.worldHints,
    motionHints: body.motionHints,
  });

  try {
    const result = await materializePresetIntoStudioProject(user.id, context, user);
    if (!result.ok) {
      const status =
        result.code === "MATERIALIZATION_MISSING_INPUT"
          ? 422
          : result.code === "SKIPPED_ONE_SHOT"
            ? 409
            : 400;
      return NextResponse.json(
        {
          error: result.message,
          code: result.code,
          providerCalls: 0,
          creditsDebited: 0,
        },
        { status }
      );
    }

    return NextResponse.json(
      {
        storyboardId: result.storyboardId,
        workspaceHref: result.workspaceHref,
        reused: result.reused,
        record: result.record,
        providerCalls: 0,
        creditsDebited: 0,
        durationMs: result.durationMs,
      },
      { status: result.reused ? 200 : 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Materialization failed.";
    return NextResponse.json(
      { error: message, code: "MATERIALIZATION_FAILED", providerCalls: 0, creditsDebited: 0 },
      { status: 500 }
    );
  }
}
