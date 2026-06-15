/**
 * HomeCheff Assistant V1 — conversational navigation assistant.
 * Set NEXT_PUBLIC_HOMECHEFF_ASSISTANT=false to hide without removing code paths.
 */
export function isHomeCheffAssistantEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_HOMECHEFF_ASSISTANT?.trim().toLowerCase();
  if (raw === "false" || raw === "0") {
    return false;
  }
  return true;
}

export function isHomeCheffAssistantRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/studio") ||
    pathname.startsWith("/editor") ||
    pathname.startsWith("/animate") ||
    pathname.startsWith("/publish") ||
    pathname.startsWith("/presentation") ||
    pathname.startsWith("/projects") ||
    pathname === "/library" ||
    pathname.startsWith("/library/")
  );
}
