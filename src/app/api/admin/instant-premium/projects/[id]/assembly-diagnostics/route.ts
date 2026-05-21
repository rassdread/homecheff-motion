import { NextResponse } from "next/server";
import {
  buildSegmentIntegrityReport,
  validateTransitionImageChain,
  type TransitionRow,
} from "@/lib/instant-segment-integrity-check";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";
import {
  attachSegmentIntegrityVerdict,
  buildHardAssemblyDiagnostics,
} from "@/server/instant-premium/hard-assembly-diagnostics";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  if (!canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const diagnostics = await buildHardAssemblyDiagnostics(id);
  if (!diagnostics) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const transitions = await prisma.animationTransition.findMany({
    where: { projectId: id },
    orderBy: { order: "asc" },
    select: {
      id: true,
      order: true,
      status: true,
      startImageId: true,
      endImageId: true,
      providerJobId: true,
      outputVideoUrl: true,
    },
  });

  const chain = validateTransitionImageChain(transitions as TransitionRow[]);
  const integrity = buildSegmentIntegrityReport({
    projectId: id,
    segments: transitions.map((t) => ({
      transitionId: t.id,
      order: t.order,
      status: t.status,
      startImageId: t.startImageId,
      endImageId: t.endImageId,
      providerJobId: t.providerJobId,
      outputVideoUrl: t.outputVideoUrl,
      metrics: {
        durationSec: null,
        frameCount: null,
        width: null,
        height: null,
        fps: null,
        sha256: diagnostics.providerVideoStorage.find((s) => s.transitionId === t.id)?.sha256 ?? null,
        motionScore: null,
        likelyFrozen: null,
        imagePlaceholderUrl: false,
        probeError: null,
      },
      duplicateUrl: false,
      duplicateHash: false,
      issues: [],
    })),
    chain,
  });

  const payload = await attachSegmentIntegrityVerdict(diagnostics, integrity.verdict);

  console.info("[hard-assembly-diagnostics]", {
    projectId: id,
    verdict: integrity.verdict,
    comparison: payload.comparison,
    plainConcatActive: payload.env.plainConcatActive,
  });

  return NextResponse.json(
    {
      ...payload,
      segmentIntegrity: integrity,
    },
    { status: 200 }
  );
}
