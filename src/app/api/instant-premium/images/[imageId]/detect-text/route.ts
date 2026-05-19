import { NextResponse } from "next/server";
import { detectedBlockToRecord } from "@/lib/baked-text-detection";
import { prisma } from "@/lib/prisma";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";
import { detectTextBlocksFromImageUrl } from "@/server/image-text-detection";

type RouteContext = {
  params: Promise<{ imageId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { imageId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { imageUrl?: string };
  let imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

  const dbImage = await prisma.animationImage.findUnique({
    where: { id: imageId },
    include: { project: { select: { ownerId: true } } },
  });

  if (dbImage) {
    const allowed = dbImage.project.ownerId === user.id || canAccessAdmin(user);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (!imageUrl) {
      imageUrl = dbImage.storageKey?.trim() || dbImage.previewUrl?.trim() || "";
    }
  }

  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required." }, { status: 400 });
  }

  try {
    const result = await detectTextBlocksFromImageUrl(imageUrl);
    const blocks = result.blocks.map(detectedBlockToRecord);
    return NextResponse.json({
      imageId,
      provider: result.provider,
      imageWidth: result.imageWidth,
      imageHeight: result.imageHeight,
      blocks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Text detection failed.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
