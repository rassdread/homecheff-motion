/** Show draft GET/POST status lines in the editor (dev, admin, or NEXT_PUBLIC_ENABLE_DEBUG_UI). */
export function shouldShowFullRerenderDraftDiagnostics(isAdmin: boolean): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  if (process.env.NEXT_PUBLIC_ENABLE_DEBUG_UI === "true") {
    return true;
  }
  return isAdmin;
}

export type FullRerenderDraftBootstrapDiagnostics = {
  getStatus: number;
  postStatus: number | null;
  getOk: boolean;
  postOk: boolean | null;
  getCode?: string;
  postCode?: string;
};

export function formatDraftBootstrapDiagnostics(
  diagnostics: FullRerenderDraftBootstrapDiagnostics
): string[] {
  const lines: string[] = [];
  if (diagnostics.getOk) {
    lines.push(`Draft GET: OK (${diagnostics.getStatus})`);
  } else {
    lines.push("Draft GET failed", `Status: ${diagnostics.getStatus}`);
  }
  if (diagnostics.getCode) {
    lines.push(`GET code: ${diagnostics.getCode}`);
  }
  if (diagnostics.postStatus != null) {
    if (diagnostics.postOk) {
      lines.push(`Draft POST: OK (${diagnostics.postStatus})`);
    } else {
      lines.push("Draft POST failed", `Status: ${diagnostics.postStatus}`);
    }
    if (diagnostics.postCode) {
      lines.push(`POST code: ${diagnostics.postCode}`);
    }
  }
  return lines;
}
