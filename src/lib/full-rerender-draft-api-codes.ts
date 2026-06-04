export const FULL_RERENDER_DRAFT_CODES = {
  STORAGE_UNAVAILABLE: "DRAFT_STORAGE_UNAVAILABLE",
  FAILED: "FULL_RERENDER_DRAFT_FAILED",
} as const;

export type FullRerenderDraftApiCode =
  (typeof FULL_RERENDER_DRAFT_CODES)[keyof typeof FULL_RERENDER_DRAFT_CODES];

export function isDraftStorageUnavailableResponse(
  status: number,
  data: { code?: string }
): boolean {
  return (
    status === 503 || data.code === FULL_RERENDER_DRAFT_CODES.STORAGE_UNAVAILABLE
  );
}
