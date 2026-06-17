/**
 * Parse API credit gate error responses for UI display.
 */

export type CreditGateErrorPayload = {
  creditGate: true;
  code?: string;
  preview?: {
    requiredCredits?: number;
    balanceAfter?: number;
    actionType?: string;
  };
  estimatedCredits?: number;
};

export function parseCreditGateResponse(body: unknown): CreditGateErrorPayload | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const row = body as Record<string, unknown>;
  if (row.creditGate !== true) {
    return null;
  }
  return {
    creditGate: true,
    code: typeof row.code === "string" ? row.code : undefined,
    preview:
      row.preview && typeof row.preview === "object"
        ? (row.preview as CreditGateErrorPayload["preview"])
        : undefined,
    estimatedCredits:
      typeof row.estimatedCredits === "number"
        ? row.estimatedCredits
        : typeof (row.preview as { requiredCredits?: number } | undefined)?.requiredCredits ===
            "number"
          ? (row.preview as { requiredCredits: number }).requiredCredits
          : undefined,
  };
}
