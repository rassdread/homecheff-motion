/**
 * Server-side production transaction validation — reject forged bypass headers.
 */

import { getHomeCheffProjectRecord } from "@/server/projects/homecheff-project-service";
import { readOrchestratorState } from "@/lib/studio-production-orchestrator";
import { isActiveProductionTransaction, productionTransactionCoversAction } from "@/lib/studio-production-transaction";
import { contractCoversAction } from "@/types/studio-video-plan-contract";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { ProductionTransaction } from "@/types/studio-video-production";

export type ProductionTransactionValidation =
  | {
      ok: true;
      transaction: ProductionTransaction;
      reservationId: string;
      hcProjectId: string;
      project: HomeCheffProjectPackage;
    }
  | { ok: false; code: string; message: string };

export function parseHomeCheffProjectManifest(record: {
  manifestJson: unknown;
}): HomeCheffProjectPackage | null {
  if (!record.manifestJson || typeof record.manifestJson !== "object") {
    return null;
  }
  return record.manifestJson as HomeCheffProjectPackage;
}

export async function validateProductionTransactionForAction(input: {
  userId: string;
  hcProjectId?: string;
  productionTransactionId?: string;
  actionType: string;
}): Promise<ProductionTransactionValidation> {
  const txId = input.productionTransactionId?.trim();
  const projectId = input.hcProjectId?.trim();

  if (!txId || !projectId) {
    return {
      ok: false,
      code: "PRODUCTION_TX_REQUIRED",
      message: "Production transaction and project id are required.",
    };
  }

  const record = await getHomeCheffProjectRecord(input.userId, projectId);
  if (!record) {
    return {
      ok: false,
      code: "PROJECT_NOT_FOUND",
      message: "Project not found or access denied.",
    };
  }

  const project = parseHomeCheffProjectManifest(record);
  if (!project) {
    return {
      ok: false,
      code: "INVALID_PROJECT",
      message: "Project manifest is invalid.",
    };
  }

  const orchestrator = readOrchestratorState(project);
  const transaction = orchestrator.productionTransaction;

  if (!transaction || transaction.id !== txId) {
    return {
      ok: false,
      code: "INVALID_PRODUCTION_TX",
      message: "Production transaction id does not match active project contract.",
    };
  }

  if (!isActiveProductionTransaction(transaction)) {
    return {
      ok: false,
      code: "PRODUCTION_TX_INACTIVE",
      message: "Production transaction is already settled.",
    };
  }

  const contract = orchestrator.videoPlanContract;
  const actionAllowed =
    (contract && contractCoversAction(contract, input.actionType)) ||
    productionTransactionCoversAction(transaction, input.actionType);

  if (!actionAllowed) {
    return {
      ok: false,
      code: "ACTION_NOT_IN_CONTRACT",
      message: "This action is not covered by the active Video Plan contract.",
    };
  }

  return {
    ok: true,
    transaction,
    reservationId: transaction.reservationId,
    hcProjectId: projectId,
    project,
  };
}
