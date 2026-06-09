import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAssetsHubCounts } from "@/lib/studio-asset-hub-counts";
import { requireActiveUser } from "@/server/auth/permissions";
import { loadUserStudioAssetRegistry } from "@/server/studio/load-user-studio-asset-registry";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const [{ registry }, videoCount] = await Promise.all([
    loadUserStudioAssetRegistry(user),
    prisma.animationProject.count({ where: { ownerId: user.id } }),
  ]);

  const counts = computeAssetsHubCounts(registry, videoCount);
  return NextResponse.json({ ok: true, counts });
}
