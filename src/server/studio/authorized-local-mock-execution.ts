/**
 * Server-only decision for synthetic scene-image certification.
 * Request bodies are not an input. A client provider name, test flag,
 * or billing flag cannot authorize this path.
 */
import { filmCertLocalDatabaseReason } from "@/server/auth/film-cert-local-auth";

export function isAuthorizedLocalMockSceneImageExecution(input: {
  env: NodeJS.ProcessEnv;
  hostHeader: string | null;
}): boolean {
  if (input.env.STUDIO_SCENE_IMAGE_PROVIDER?.trim().toLowerCase() !== "mock") return false;
  if (input.env.STUDIO_FILM_CERT_LOCAL_AUTH !== "true") return false;
  if (filmCertLocalDatabaseReason(input.env) !== null) return false;
  const hostname = (input.hostHeader ?? "").trim().split(":")[0]?.toLowerCase() ?? "";
  return hostname === "127.0.0.1" || hostname === "localhost";
}
