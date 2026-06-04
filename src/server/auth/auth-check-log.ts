export type AuthCheckLogEntry = {
  pathname: string;
  sessionExists: boolean;
  userId: string | null;
  status: string;
};

/** Structured auth diagnostics for API routes (Vercel logs: `[auth-check]`). */
export function logAuthCheck(entry: AuthCheckLogEntry): void {
  if (process.env.AUTH_CHECK_LOG === "0") {
    return;
  }
  console.log(
    "[auth-check]",
    JSON.stringify({
      pathname: entry.pathname,
      sessionExists: entry.sessionExists,
      userId: entry.userId,
      status: entry.status,
    })
  );
}
