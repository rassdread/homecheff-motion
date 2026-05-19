/** Ask the server to poll Vidu, merge clips, and finalize exports for in-progress projects. */
export async function syncActiveAnimationProjects(): Promise<void> {
  await fetch("/api/animations/projects/sync-active", {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
}
