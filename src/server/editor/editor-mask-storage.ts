/**
 * User-scoped editor mask/cutout blob paths.
 * Cleanup: masks are session-scoped; future cron can prune studio/{userId}/editor-masks/
 * older than retention policy (see storage-retention-policy.ts).
 */

export function editorMaskStoragePath(params: {
  userId: string;
  sessionId: string;
  objectId: string;
  kind: "mask" | "cutout";
}): string {
  const safeSession = params.sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeObject = params.objectId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const folder = params.kind === "mask" ? "editor-masks" : "editor-cutouts";
  return `studio/${params.userId}/${folder}/${safeSession}/${safeObject}.png`;
}
