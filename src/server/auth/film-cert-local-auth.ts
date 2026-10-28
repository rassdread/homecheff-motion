/**
 * Local-only password login for the film-certification database.
 * Inactive unless STUDIO_FILM_CERT_LOCAL_AUTH is exactly "true",
 * Vercel is absent, and DATABASE_URL is 127.0.0.1/localhost port 5432
 * for homecheff_film_cert_2u. The browser origin must be https and
 * must match the Host header. Protected hosts never match.
 * This gate does not enable the disposable http database.
 */

export const FILM_CERT_LOCAL_DATABASE_NAME = "homecheff_film_cert_2u";

const BLOCKED_MARKERS = [
  "neon.tech",
  "ep-wild-morning",
  "ep-purple-moon",
  "ep-withered-moon",
  "homecheff.eu",
  "amazonaws.com",
  "vercel-storage.com",
];

export function filmCertLocalDatabaseReason(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.VERCEL || env.VERCEL_ENV || env.VERCEL_URL) return "vercel_environment";
  const raw = env.DATABASE_URL?.trim() ?? "";
  if (!raw) return "missing_database_url";
  const lower = raw.toLowerCase();
  if (BLOCKED_MARKERS.some((part) => lower.includes(part))) return "protected_target";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "invalid_database_url";
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") return "database_protocol";
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") return "database_host";
  if (parsed.port && parsed.port !== "5432") return "database_port";
  const name = decodeURIComponent(parsed.pathname.replace(/^\//, "").split("?")[0] ?? "");
  if (name !== FILM_CERT_LOCAL_DATABASE_NAME) return "database_name";
  return null;
}

export function canUseFilmCertLocalPasswordLogin(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.STUDIO_FILM_CERT_LOCAL_AUTH === "true" && filmCertLocalDatabaseReason(env) === null;
}

export function isFilmCertLocalBrowserRequest(
  request: { headers: { get(name: string): string | null } },
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!canUseFilmCertLocalPasswordLogin(env)) return false;
  const hostHeader = request.headers.get("host")?.trim() ?? "";
  const hostname = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  if (hostname !== "localhost" && hostname !== "127.0.0.1") return false;
  const origin = request.headers.get("origin")?.trim() ?? "";
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    return url.host === hostHeader && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}
