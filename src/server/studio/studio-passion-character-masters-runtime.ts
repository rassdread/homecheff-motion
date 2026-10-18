import type { Prisma } from "@prisma/client";
import {
  GPT_IMAGE_1_HIGH_QUALITY,
  GPT_IMAGE_1_MODEL,
  GPT_IMAGE_1_PORTRAIT_SIZE,
  issuePassionMasterQuote,
  passionCharacterPrompt,
  PASSION_CALL_USD_BOUND,
  PASSION_HC_PER_IMAGE,
  PASSION_PROMPT_VERSION,
  type PassionAttemptRecord,
  type PassionCharacterKey,
  type PassionMasterQuote,
} from "@/lib/studio-passion-stage-a";
import { prisma } from "@/lib/prisma";
import { getSceneImageProvider } from "@/server/scene-image-providers";
import { uploadStudioAssetReferenceBuffers } from "@/server/studio/studio-asset-reference-blob";
import { createStudioCharacter } from "@/server/studio/studio-character-service";
import {
  claimPassionMasterReservation,
  executePassionMasterGeneration,
  isPassionUniqueConflict,
  type PassionClaimDatabase,
  type PassionMasterDeps,
  type PassionMasterResult,
} from "@/server/studio/studio-passion-character-masters";
import { appendStudioLedgerEntry } from "@/server/studio-account/studio-ledger-service";
import {
  captureStudioCredits,
  getWalletForUpdate,
  refundStudioReservation,
} from "@/server/studio-account/studio-wallet-service";

export function passionQuoteSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";
  if (!secret) {
    throw new Error("QUOTE_SECRET_MISSING");
  }
  return secret;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function loadPassionAttempts(input: {
  userId: string;
  projectId: string;
  quoteId: string;
}): Promise<PassionAttemptRecord[]> {
  const rows = await prisma.studioLedgerEntry.findMany({
    where: {
      userId: input.userId,
      projectId: input.projectId,
      metadataJson: { path: ["batchQuoteId"], equals: input.quoteId },
    },
    select: { actionType: true, metadataJson: true, providerCostUsd: true },
    orderBy: { createdAt: "asc" },
  });
  const byKey = new Map<string, PassionAttemptRecord>();
  for (const row of rows) {
    const meta = asRecord(row.metadataJson);
    const characterKey = meta?.characterKey;
    const attempt = meta?.attempt;
    if (characterKey !== "baker" && characterKey !== "potter" && characterKey !== "gardener") continue;
    if (attempt !== 1 && attempt !== 2) continue;
    const key = `${characterKey}:${attempt}`;
    const current = byKey.get(key) ?? {
      characterKey,
      attempt,
      status: "open" as const,
      providerUsd: PASSION_CALL_USD_BOUND,
    };
    if (row.actionType === "usage_capture") {
      current.status = "captured";
      current.providerUsd = row.providerCostUsd ?? current.providerUsd;
    } else if (row.actionType === "usage_refund" || row.actionType === "failed_generation_refund") {
      current.status = "released";
      const releasedUsd = meta?.providerUsd;
      current.providerUsd = typeof releasedUsd === "number" ? releasedUsd : 0;
    }
    byKey.set(key, current);
  }
  return [...byKey.values()];
}

export async function findPassionReuse(input: {
  userId: string;
  idempotencyKey: string;
}): Promise<PassionMasterResult | null> {
  const row = await prisma.studioLedgerEntry.findFirst({
    where: {
      userId: input.userId,
      actionType: "usage_capture",
      metadataJson: { path: ["idempotencyKey"], equals: input.idempotencyKey },
    },
    select: { metadataJson: true, providerCostUsd: true },
  });
  const meta = asRecord(row?.metadataJson);
  const characterKey = meta?.characterKey;
  const characterId = meta?.characterId;
  const referenceImageUrl = meta?.referenceImageUrl;
  if (
    (characterKey !== "baker" && characterKey !== "potter" && characterKey !== "gardener") ||
    typeof characterId !== "string" ||
    typeof referenceImageUrl !== "string"
  ) {
    return null;
  }
  return {
    characterKey,
    characterId,
    referenceImageUrl,
    storageKey: typeof meta?.storageKey === "string" ? meta.storageKey : "",
    hcCharged: PASSION_HC_PER_IMAGE,
    providerUsd: row?.providerCostUsd ?? PASSION_CALL_USD_BOUND,
    reused: true,
  };
}

async function persistMaster(input: {
  userId: string;
  projectId: string;
  characterKey: PassionCharacterKey;
  name: string;
  prompt: string;
  imageBuffer: Buffer;
  thumbnailBuffer: Buffer;
  contentType: string;
  idempotencyKey: string;
  hc: number;
  providerUsd: number;
  attempt: 1 | 2;
}): Promise<{
  characterId: string;
  libraryAssetId: string;
  referenceImageUrl: string;
  storageKey: string;
}> {
  const uploaded = await uploadStudioAssetReferenceBuffers({
    ownerId: input.userId,
    kind: "character",
    generationId: input.idempotencyKey,
    imageBuffer: input.imageBuffer,
    thumbnailBuffer: input.thumbnailBuffer,
    imageContentType: input.contentType,
    thumbContentType: "image/jpeg",
    promptSummary: input.prompt.slice(0, 240),
    sourceAssetName: input.name,
    origin: "generated",
    projectTitle: "MADE WITH PASSION",
  });
  const existing = await prisma.studioLibraryAsset.findUnique({
    where: {
      ownerId_sourceKind_sourceId: {
        ownerId: input.userId,
        sourceKind: "passion_character_master",
        sourceId: input.characterKey,
      },
    },
    select: { id: true, metadataJson: true },
  });
  const previousId = asRecord(existing?.metadataJson)?.characterId;
  let characterId = typeof previousId === "string" ? previousId : "";
  if (!characterId) {
    const created = await createStudioCharacter(input.userId, {
      name: input.name,
      role: "human",
      description: input.prompt,
      appearanceMemory: input.prompt,
      referenceImageUrl: uploaded.referenceImageUrl,
      referenceStorageKey: uploaded.referenceStorageKey,
    });
    if ("error" in created) {
      throw new Error(created.error.code);
    }
    characterId = created.character.id;
  } else {
    await prisma.studioCharacter.updateMany({
      where: { id: characterId, ownerId: input.userId },
      data: {
        referenceImageUrl: uploaded.referenceImageUrl,
        referenceStorageKey: uploaded.referenceStorageKey,
        appearanceMemory: input.prompt,
      },
    });
  }

  const metadata = {
    audit: "HOMECHEFF_STUDIO_CHARACTER_MASTERS_STAGE_A_V3",
    characterKey: input.characterKey,
    characterId,
    projectId: input.projectId,
    model: GPT_IMAGE_1_MODEL,
    size: GPT_IMAGE_1_PORTRAIT_SIZE,
    quality: GPT_IMAGE_1_HIGH_QUALITY,
    promptVersion: PASSION_PROMPT_VERSION,
    prompt: input.prompt,
    hc: input.hc,
    providerUsd: input.providerUsd,
    attempt: input.attempt,
    approvalStatus: "pending_visual_review",
    generationStatus: "generated",
  } satisfies Prisma.InputJsonObject;

  let libraryAssetId = existing?.id ?? "";
  if (!existing) {
    const createdAsset = await prisma.studioLibraryAsset.create({
      data: {
        ownerId: input.userId,
        projectId: input.projectId,
        family: "character",
        category: "character_master",
        title: input.name,
        description: input.prompt,
        origin: "generated",
        status: "draft",
        previewUrl: uploaded.referenceImageUrl,
        downloadUrl: uploaded.referenceImageUrl,
        storageKey: uploaded.referenceStorageKey,
        mimeType: input.contentType,
        backingStore: "blob_manifest",
        sourceKind: "passion_character_master",
        sourceId: input.characterKey,
        aiModel: GPT_IMAGE_1_MODEL,
        generator: "openai",
        creditsSpent: input.hc,
        width: 1024,
        height: 1536,
        aspectRatio: "2:3",
        promptSummary: input.prompt.slice(0, 240),
        metadataJson: metadata,
      },
    });
    libraryAssetId = createdAsset.id;
  } else {
    await prisma.studioLibraryAsset.update({
      where: { id: existing.id },
      data: {
        projectId: input.projectId,
        previewUrl: uploaded.referenceImageUrl,
        downloadUrl: uploaded.referenceImageUrl,
        storageKey: uploaded.referenceStorageKey,
        creditsSpent: input.hc,
        status: "draft",
        metadataJson: metadata,
      },
    });
  }

  const project = await prisma.studioCreativeProject.findFirst({
    where: { id: input.projectId, ownerId: input.userId },
    select: { metadataJson: true },
  });
  const current = asRecord(project?.metadataJson) ?? {};
  const characters = Array.isArray(current.characters) ? current.characters : [];
  const nextCharacters = characters.map((entry) => {
    const row = asRecord(entry);
    if (!row || row.key !== input.characterKey) return entry;
    return {
      ...row,
      studioCharacterId: characterId,
      status: "pending_visual_review",
      referenceImageUrl: uploaded.referenceImageUrl,
    };
  });
  await prisma.studioCreativeProject.updateMany({
    where: { id: input.projectId, ownerId: input.userId },
    data: {
      metadataJson: {
        ...current,
        characters: nextCharacters,
      } as Prisma.InputJsonObject,
    },
  });

  return {
    characterId,
    libraryAssetId,
    referenceImageUrl: uploaded.referenceImageUrl,
    storageKey: uploaded.referenceStorageKey,
  };
}

function passionClaimDatabase(input: {
  userId: string;
  projectId: string;
  credits: number;
  providerUsdBound: number;
  characterKey: PassionCharacterKey;
  attempt: 1 | 2;
  quoteId: string;
}): PassionClaimDatabase {
  return {
    async transaction(fn) {
      let claimedKey = "";
      try {
        return await prisma.$transaction(async (tx) =>
          fn({
            insertGeneratingClaim: async (idempotencyKey) => {
              claimedKey = idempotencyKey;
              await tx.studioGenerationJob.create({
                data: {
                  ownerId: input.userId,
                  capability: "IMAGE_GENERATE",
                  actionType: "character_generation",
                  status: "generating",
                  executionMode: "sync",
                  providerAdapter: "openai_image",
                  idempotencyKey,
                  inputHash: idempotencyKey,
                  creditCost: input.credits,
                  creditsReserved: input.credits,
                  attempt: input.attempt,
                  maxAttempts: 1,
                  startedAt: new Date(),
                  metadataJson: {
                    audit: "HOMECHEFF_STUDIO_CHARACTER_MASTERS_PREVIEW_DEPLOY_V1",
                    batchQuoteId: input.quoteId,
                    characterKey: input.characterKey,
                    attempt: input.attempt,
                    idempotencyKey,
                    walletSource: "studio_hc",
                    promptVersion: PASSION_PROMPT_VERSION,
                    model: GPT_IMAGE_1_MODEL,
                    size: GPT_IMAGE_1_PORTRAIT_SIZE,
                    quality: GPT_IMAGE_1_HIGH_QUALITY,
                  },
                },
              });
            },
            reserveStudioWallet: async () => {
              const wallet = await getWalletForUpdate(input.userId, tx);
              if (wallet.balance - wallet.reservedBalance < input.credits) {
                throw new Error("INSUFFICIENT_CREDITS");
              }
              await tx.studioWallet.update({
                where: { userId: input.userId },
                data: {
                  reservedBalance: wallet.reservedBalance + input.credits,
                  lastTransactionAt: new Date(),
                },
              });
              const ledger = await appendStudioLedgerEntry(
                {
                  userId: input.userId,
                  projectId: input.projectId,
                  service: "studio",
                  actionType: "usage_reservation",
                  creditsDelta: 0,
                  balanceAfter: wallet.balance,
                  provider: "openai",
                  reservedCostUsd: input.providerUsdBound,
                  metadataJson: {
                    batchQuoteId: input.quoteId,
                    idempotencyKey: claimedKey,
                    characterKey: input.characterKey,
                    attempt: input.attempt,
                    providerUsdBound: input.providerUsdBound,
                    model: GPT_IMAGE_1_MODEL,
                    size: GPT_IMAGE_1_PORTRAIT_SIZE,
                    quality: GPT_IMAGE_1_HIGH_QUALITY,
                    promptVersion: PASSION_PROMPT_VERSION,
                    walletSource: "studio_hc",
                    walletDebited: false,
                    reservedCredits: input.credits,
                  },
                },
                tx
              );
              await tx.studioGenerationJob.updateMany({
                where: { ownerId: input.userId, idempotencyKey: claimedKey },
                data: { creditReservationId: ledger.id },
              });
              return { reservationId: ledger.id };
            },
          })
        );
      } catch (error) {
        if (isPassionUniqueConflict(error)) {
          const conflict = new Error("PASSION_CLAIM_CONFLICT");
          (conflict as Error & { code: string }).code = "P2002";
          throw conflict;
        }
        throw error;
      }
    },
    async readClaim(idempotencyKey) {
      const row = await prisma.studioGenerationJob.findUnique({
        where: { ownerId_idempotencyKey: { ownerId: input.userId, idempotencyKey } },
        select: { status: true, chargeFinalized: true },
      });
      if (!row) return null;
      if (row.chargeFinalized || row.status === "succeeded") return "succeeded";
      if (row.status === "failed" || row.status === "cancelled") return "failed";
      return "generating";
    },
  };
}

function runtimeDeps(): PassionMasterDeps {
  return {
    claim: async (reserveInput) =>
      claimPassionMasterReservation(
        passionClaimDatabase({
          userId: reserveInput.userId,
          projectId: reserveInput.projectId,
          credits: reserveInput.credits,
          providerUsdBound: reserveInput.providerUsdBound,
          characterKey: reserveInput.characterKey,
          attempt: reserveInput.attempt,
          quoteId: reserveInput.quote.id,
        }),
        reserveInput.idempotencyKey
      ),
    settle: async (settled) => {
      await prisma.studioGenerationJob.updateMany({
        where: {
          ownerId: settled.userId,
          idempotencyKey: settled.idempotencyKey,
          status: "generating",
        },
        data:
          settled.outcome === "captured"
            ? {
                status: "succeeded",
                chargeFinalized: true,
                creditsCharged: PASSION_HC_PER_IMAGE,
                completedAt: new Date(),
              }
            : {
                status: "failed",
                failedAt: new Date(),
                errorCode: "GENERATION_FAILED",
                chargeFinalized: false,
              },
      });
    },
    generate: async (generateInput) => {
      const provider = getSceneImageProvider();
      const image = await provider.generate({
        prompt: generateInput.prompt,
        sceneId: generateInput.idempotencyKey,
        imageRecordId: generateInput.idempotencyKey,
        ownerId: generateInput.ownerId,
        lockedModel: GPT_IMAGE_1_MODEL,
        lockedSize: GPT_IMAGE_1_PORTRAIT_SIZE,
        lockedQuality: GPT_IMAGE_1_HIGH_QUALITY,
        logRoute: "/api/studio/projects/[projectId]/character-masters",
      });
      return {
        imageBuffer: image.imageBuffer,
        thumbnailBuffer: image.thumbnailBuffer,
        contentType: image.contentType,
        usage: image.providerUsage ?? null,
      };
    },
    persist: persistMaster,
    capture: async (captureInput) => {
      const [batchQuoteId, characterKey, attemptText] = captureInput.idempotencyKey.split(":");
      await captureStudioCredits({
        userId: captureInput.userId,
        credits: captureInput.credits,
        reservationId: captureInput.reservationId,
        service: "studio",
        provider: "openai",
        projectId: captureInput.projectId,
        providerCostUsd: captureInput.providerUsd,
        reservedCostUsd: PASSION_CALL_USD_BOUND,
        metadataJson: {
          batchQuoteId,
          idempotencyKey: captureInput.idempotencyKey,
          characterKey,
          attempt: Number(attemptText),
          characterId: captureInput.characterId,
          referenceImageUrl: captureInput.referenceImageUrl,
          providerUsd: captureInput.providerUsd,
        },
      });
    },
    refund: async (refundInput) => {
      const [batchQuoteId, characterKey, attemptText] = refundInput.idempotencyKey.split(":");
      await refundStudioReservation({
        userId: refundInput.userId,
        credits: refundInput.credits,
        reservationId: refundInput.reservationId,
        service: "studio",
        provider: "openai",
        projectId: refundInput.projectId,
        failedGeneration: refundInput.failed,
        metadataJson: {
          batchQuoteId,
          idempotencyKey: refundInput.idempotencyKey,
          characterKey,
          attempt: Number(attemptText),
          providerUsd: refundInput.providerUsd,
        },
      });
    },
    findReuse: findPassionReuse,
  };
}

export async function previewOwnedPassionQuote(input: { userId: string; projectId: string; nowMs: number }) {
  const project = await prisma.studioCreativeProject.findFirst({
    where: { id: input.projectId, ownerId: input.userId, title: "MADE WITH PASSION" },
    select: { id: true, title: true, ownerId: true },
  });
  if (!project) return null;
  const wallet = await prisma.studioWallet.findUnique({
    where: { userId: input.userId },
    select: { balance: true, reservedBalance: true },
  });
  const quote = issuePassionMasterQuote({
    userId: input.userId,
    projectId: project.id,
    nowMs: input.nowMs,
    secret: passionQuoteSecret(),
  });
  const attempts = await loadPassionAttempts({
    userId: input.userId,
    projectId: project.id,
    quoteId: quote.id,
  });
  const savedAssets = await prisma.studioLibraryAsset.findMany({
    where: {
      ownerId: input.userId,
      projectId: project.id,
      sourceKind: "passion_character_master",
    },
    select: {
      id: true,
      sourceId: true,
      previewUrl: true,
      downloadUrl: true,
      metadataJson: true,
    },
  });
  const saved = savedAssets.flatMap((asset) => {
    const metadata = asRecord(asset.metadataJson);
    const characterId = typeof metadata?.characterId === "string" ? metadata.characterId : "";
    if (!characterId || !asset.previewUrl) return [];
    return [
      {
        characterKey: asset.sourceId,
        characterId,
        libraryAssetId: asset.id,
        referenceImageUrl: asset.previewUrl,
        downloadUrl: asset.downloadUrl || asset.previewUrl,
      },
    ];
  });
  return {
    project,
    quote,
    studioHcAvailable: wallet ? wallet.balance - wallet.reservedBalance : null,
    walletSource: "studio_hc" as const,
    attempts,
    saved,
    characters: (["baker", "potter", "gardener"] as const).map((key) => ({
      key,
      name: passionCharacterPrompt(key).name,
      prompt: passionCharacterPrompt(key).prompt,
    })),
  };
}

export async function confirmOwnedPassionMaster(input: {
  userId: string;
  projectId: string;
  presentedQuote: PassionMasterQuote | null;
  characterKey: string;
  attempt: number;
  confirmed: boolean;
  retryConfirmed: boolean;
  nowMs: number;
}) {
  const project = await prisma.studioCreativeProject.findFirst({
    where: { id: input.projectId, ownerId: input.userId },
    select: { id: true, title: true, ownerId: true },
  });
  const secret = passionQuoteSecret();
  const quoteId = input.presentedQuote?.id ?? "";
  const attempts = quoteId
    ? await loadPassionAttempts({ userId: input.userId, projectId: input.projectId, quoteId })
    : [];
  return executePassionMasterGeneration({
    userId: input.userId,
    project,
    presentedQuote: input.presentedQuote,
    characterKey: input.characterKey,
    attempt: input.attempt,
    confirmed: input.confirmed,
    retryConfirmed: input.retryConfirmed,
    nowMs: input.nowMs,
    secret,
    attempts,
    deps: runtimeDeps(),
  });
}
