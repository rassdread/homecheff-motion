import type { SameOriginJsonResult } from "@/lib/client-api-fetch";

export type StudioWorkspaceLoadFailure =
  | { kind: "network"; accessControl: boolean; message: string }
  | { kind: "auth"; message: string }
  | { kind: "not_found"; message: string }
  | { kind: "api"; message: string };

type ErrorPayload = { error?: string; code?: string };

export function resolveStudioWorkspaceLoadFailure(
  storyboardRes: SameOriginJsonResult<unknown>,
  fallbackMessage: string
): StudioWorkspaceLoadFailure | null {
  if (storyboardRes.ok) {
    return null;
  }

  if (storyboardRes.networkError) {
    const message =
      (storyboardRes.data as ErrorPayload).error ??
      (storyboardRes.accessControl
        ? "Network or session blocked this request. Stay on motion.homecheff.eu, sign in again, and retry."
        : fallbackMessage);
    return {
      kind: "network",
      accessControl: Boolean(storyboardRes.accessControl),
      message,
    };
  }

  if (storyboardRes.status === 401) {
    return {
      kind: "auth",
      message:
        (storyboardRes.data as ErrorPayload).error ?? "Authentication required. Sign in and retry.",
    };
  }

  if (storyboardRes.status === 404) {
    return {
      kind: "not_found",
      message: (storyboardRes.data as ErrorPayload).error ?? "Storyboard not found.",
    };
  }

  return {
    kind: "api",
    message: (storyboardRes.data as ErrorPayload).error ?? fallbackMessage,
  };
}
