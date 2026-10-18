export function safeStudioProjectReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith("/studio/projects/")) return null;
  if (path.startsWith("//") || path.includes("://") || path.includes("\\") || path.includes("?")) {
    return null;
  }
  return path;
}
