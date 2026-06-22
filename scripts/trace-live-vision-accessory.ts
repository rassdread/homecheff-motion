import { prisma } from "@/lib/prisma";

const PROJECT_ID = process.argv[2] ?? "9a95ae57-78ef-48b6-92c0-11f09a673b0d";

async function main() {
  const row = await prisma.editorCanvasProject.findUnique({ where: { id: PROJECT_ID } });
  if (!row) {
    console.log(JSON.stringify({ error: "NOT_FOUND" }, null, 2));
    return;
  }

  const payload = row.payload as { document?: Record<string, unknown> } | Record<string, unknown>;
  const doc = (payload.document ?? payload) as Record<string, unknown>;
  const v6 = doc.visionV6Meta as Record<string, unknown> | undefined;
  const vision = doc.visionAnalysis as Record<string, unknown> | undefined;
  const audit = (v6?.evidenceAudit as Record<string, unknown> | undefined) ?? {};

  type Node = { label?: string; truthSection?: string; truthTier?: string; source?: string; confidence?: number; children?: Node[] };
  function walk(nodes: Node[] | undefined, acc: Node[] = []): Node[] {
    for (const n of nodes ?? []) {
      acc.push(n);
      walk(n.children, acc);
    }
    return acc;
  }
  const nodes = walk(doc.visionHierarchy as Node[] | undefined);

  console.log(
    JSON.stringify(
      {
        scope: {
          projectId: PROJECT_ID,
          assetId: (doc.isolationScope as { assetId?: string })?.assetId,
          analysisId: (doc.isolationScope as { analysisId?: string })?.analysisId,
          runAnalysisId: (doc.visionAnalysisRun as { analysisId?: string })?.analysisId,
          analysisIdsMatch:
            (doc.isolationScope as { analysisId?: string })?.analysisId ===
            (doc.visionAnalysisRun as { analysisId?: string })?.analysisId,
        },
        vision: {
          objectType: vision?.objectType,
          objectTypeLabel: vision?.objectTypeLabel,
          keyFeatures: vision?.keyFeatures,
          visualStyle: vision?.visualStyle,
        },
        allPartLabels: nodes.filter((n) => n.truthTier && !n.truthSection).map((n) => ({
          label: n.label,
          tier: n.truthTier,
          source: n.source,
          confidence: n.confidence,
        })),
        accessoryAudit: audit.accessoryAudit,
        glassExplanations: (audit.detectionExplanations as { label: string; decision: string; reason: string }[] | undefined)?.filter(
          (e) => /glass|sunglass|eyewear|necklace|hat|beard|hair/i.test(e.label)
        ),
      },
      null,
      2
    )
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
