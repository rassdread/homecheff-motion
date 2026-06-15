import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { ensureCompletedGenerationInLibrary } from "@/server/studio/library-consistency-service";
import type {
  LibraryFusionMetadata,
  LibraryGenerationType,
  LibraryMotionMetadata,
  LibraryPublishMetadata,
  LibrarySourceModule,
} from "@/types/library-consistency";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    generationType?: LibraryGenerationType;
    assetUrl?: string;
    storageKey?: string;
    thumbnailUrl?: string | null;
    assetName?: string;
    promptSummary?: string | null;
    projectId?: string | null;
    projectTitle?: string | null;
    sourceModule?: LibrarySourceModule;
    backingId?: string;
    isMascot?: boolean;
    isLogo?: boolean;
    sourceRoute?: string | null;
    characterCompleteness?: string | null;
    motionReadinessScore?: number | null;
    motionReady?: boolean | null;
    missingParts?: string[] | null;
    characterType?: string | null;
    assetType?: string | null;
    workflow?: string | null;
    storyboardId?: string | null;
    fusionIntent?: string | null;
    fusionArchetype?: string | null;
    fusionMetadata?: LibraryFusionMetadata | null;
    motionMetadata?: LibraryMotionMetadata | null;
    publishMetadata?: LibraryPublishMetadata | null;
    usedInModules?: LibrarySourceModule[];
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const assetUrl = body.assetUrl?.trim();
  const storageKey = body.storageKey?.trim();
  const generationType = body.generationType;
  const sourceModule = body.sourceModule ?? "studio";

  if (!assetUrl || !storageKey || !generationType) {
    return NextResponse.json(
      { ok: false, error: "assetUrl, storageKey, and generationType are required." },
      { status: 400 }
    );
  }

  const record = await ensureCompletedGenerationInLibrary({
    ownerId: user.id,
    createdBy: user.id,
    generationType,
    assetUrl,
    storageKey,
    thumbnailUrl: body.thumbnailUrl,
    assetName: body.assetName,
    promptSummary: body.promptSummary,
    projectId: body.projectId,
    projectTitle: body.projectTitle,
    sourceModule,
    backingId: body.backingId,
    isMascot: body.isMascot,
    isLogo: body.isLogo,
    sourceRoute: body.sourceRoute,
    characterCompleteness: body.characterCompleteness,
    motionReadinessScore: body.motionReadinessScore,
    motionReady: body.motionReady,
    missingParts: body.missingParts,
    characterType: body.characterType,
    assetType: body.assetType,
    workflow: body.workflow,
    storyboardId: body.storyboardId,
    fusionIntent: body.fusionIntent,
    fusionArchetype: body.fusionArchetype,
    fusionMetadata: body.fusionMetadata,
    motionMetadata: body.motionMetadata,
    publishMetadata: body.publishMetadata,
    usedInModules: body.usedInModules,
  });

  return NextResponse.json({ ok: true, record });
}
