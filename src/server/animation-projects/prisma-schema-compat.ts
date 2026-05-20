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
