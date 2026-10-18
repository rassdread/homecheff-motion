import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { extractVoiceCharacteristics } from "@/lib/studio-voice-characteristics";

const PROVIDER = "elevenlabs";

export async function replaceVoiceCharacteristics(rows: Array<{
  provider?: string;
  providerVoiceId: string;
  description: string;
  descriptive: string;
}>): Promise<number> {
  const ids = rows.map((row) => row.providerVoiceId);
  if (ids.length === 0) return 0;
  const data = rows.flatMap((row) => {
    const provider = row.provider || PROVIDER;
    return extractVoiceCharacteristics(row).map((tag) => ({
      id: randomUUID(),
      provider,
      providerVoiceId: row.providerVoiceId,
      concept: tag.concept,
      category: tag.category,
      matchType: tag.matchType,
      source: tag.source,
    }));
  });
  await prisma.$transaction([
    prisma.studioVoiceCharacteristic.deleteMany({
      where: { provider: PROVIDER, providerVoiceId: { in: ids } },
    }),
    ...(data.length ? [prisma.studioVoiceCharacteristic.createMany({ data })] : []),
  ]);
  return data.length;
}

export async function indexVoiceCharacteristicBatch(input: { cursor?: string; take: number }): Promise<{
  processed: number;
  tags: number;
  nextCursor: string;
}> {
  const take = Math.min(200, Math.max(1, input.take));
  const rows = await prisma.studioVoiceCatalogEntry.findMany({
    where: input.cursor ? { providerVoiceId: { gt: input.cursor } } : {},
    orderBy: { providerVoiceId: "asc" },
    take,
    select: { provider: true, providerVoiceId: true, description: true, descriptive: true },
  });
  const tags = await replaceVoiceCharacteristics(rows);
  return {
    processed: rows.length,
    tags,
    nextCursor: rows.at(-1)?.providerVoiceId ?? "",
  };
}
