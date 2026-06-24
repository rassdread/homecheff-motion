import { PRODUCTION_TRANSACTION_HEADER } from "@/lib/studio-production-transaction";
import { validateProductionTransactionForAction } from "@/server/studio/production-transaction-validator";

export const HC_PROJECT_HEADER = "x-hc-project-id";

export function readProductionTransactionIdFromRequest(request: Request): string | undefined {
  const header = request.headers.get(PRODUCTION_TRANSACTION_HEADER)?.trim();
  if (header) return header;
  return undefined;
}

export function readHcProjectIdFromRequest(request: Request): string | undefined {
  return request.headers.get(HC_PROJECT_HEADER)?.trim() || undefined;
}
