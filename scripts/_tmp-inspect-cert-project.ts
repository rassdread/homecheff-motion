import { config } from "dotenv";
config({ path: ".env" });
import { prisma } from "../src/lib/prisma";

async function main() {
  const id = "cmt5hnj1s0003jh09hns3vu4v";
  const p = await prisma.animationProject.findUnique({
    where: { id },
    select: {
      status: true,
      instantFinalRebuildCount: true,
      instantPreviousFinalVideoUrl: true,
      instantCleanFinalVideoUrl: true,
      instantFinalRebuildStatus: true,
      instantWorkerJobStatus: true,
      failureReason: true,
      lastOverlayError: true,
    },
  });
  const e = await prisma.animationExport.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
  const versions = await prisma.projectRenderVersion.findMany({
    where: { projectId: id },
    orderBy: { renderVersionNumber: "desc" },
    take: 5,
  });
  console.log(JSON.stringify({ p, e: e && { status: e.status, progress: e.progress, err: e.errorMessage, url: e.outputVideoUrl?.slice(0,90), hasUrl: !!e.outputVideoUrl }, versions }, null, 2));
  await prisma.$disconnect();
}
main();
