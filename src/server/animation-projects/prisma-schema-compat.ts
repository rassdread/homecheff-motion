import { Prisma } from "@prisma/client";

/** True when Postgres/Prisma reports a missing column (migration not deployed yet). */
export function isPrismaMissingColumnError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2022") {
      return true;
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes("column") &&
    (lower.includes("does not exist") ||
      lower.includes("unknown field") ||
      lower.includes("not available"))
  );
}

/** True when a table/model is missing (migration not deployed yet). */
export function isPrismaMissingTableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      return true;
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes("projectfullrerenderdraft") ||
    (lower.includes("table") && lower.includes("does not exist")) ||
    (lower.includes("relation") && lower.includes("does not exist"))
  );
}

function isPrismaStaleClientDraftDelegateError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes("projectfullrerenderdraft") &&
    (lower.includes("undefined") ||
      lower.includes("is not a function") ||
      lower.includes("unknown arg") ||
      lower.includes("invalid") ||
      lower.includes("invocation"))
  );
}

export function isPrismaDraftStorageError(error: unknown): boolean {
  return (
    isPrismaMissingTableError(error) ||
    isPrismaMissingColumnError(error) ||
    isPrismaStaleClientDraftDelegateError(error)
  );
}
