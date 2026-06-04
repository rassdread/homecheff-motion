import { NextResponse } from "next/server";
import { FULL_RERENDER_DRAFT_CODES } from "@/lib/full-rerender-draft-api-codes";
import { isPrismaDraftStorageError } from "@/server/animation-projects/prisma-schema-compat";

export function logFullRerenderDraftError(params: {
  method: string;
  projectId: string;
  userId: string;
  error: unknown;
}) {
  const err = params.error;
  const message = err instanceof Error ? err.message : String(err);
  const stack =
    err instanceof Error && err.stack ? err.stack.slice(0, 4000) : undefined;
  const prismaCode =
    err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string"
      ? (err as { code: string }).code
      : undefined;
  console.error("[full-rerender-draft]", {
    method: params.method,
    projectId: params.projectId,
    userId: params.userId,
    errorName: err instanceof Error ? err.name : typeof err,
    prismaCode,
    message: message.slice(0, 500),
    stack,
  });
}

export function fullRerenderDraftErrorResponse(
  error: unknown,
  fallbackMessage: string
): NextResponse {
  if (isPrismaDraftStorageError(error)) {
    return NextResponse.json(
      {
        ok: false,
        code: FULL_RERENDER_DRAFT_CODES.STORAGE_UNAVAILABLE,
        error:
          "Concept storage is not available yet. Run database migrations (project_full_rerender_draft).",
      },
      { status: 503 }
    );
  }
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json(
    {
      ok: false,
      code: FULL_RERENDER_DRAFT_CODES.FAILED,
      error: fallbackMessage,
      detail: process.env.NODE_ENV === "development" ? message : undefined,
    },
    { status: 500 }
  );
}
