import { fetchSameOriginJson, type SameOriginJsonResult } from "@/lib/client-api-fetch";
import { instantStatusFromProjectDetail } from "@/lib/instant-premium-status-fallback";
import type {
  AnimationProjectDetailResponse,
  InstantPremiumStatusApiResponse,
  InstantPremiumStatusResponse,
} from "@/types/animation-api";

export const INSTANT_PREMIUM_STATUS_PATH = (projectId: string) =>
  `/api/instant-premium/projects/${encodeURIComponent(projectId)}/status`;

export const ANIMATION_PROJECT_DETAIL_PATH = (projectId: string) =>
  `/api/animations/projects/${encodeURIComponent(projectId)}`;

export type InstantStatusFetchResult =
  | { kind: "ok"; data: InstantPremiumStatusResponse }
  | { kind: "api"; body: InstantPremiumStatusApiResponse; status: number }
  | { kind: "network"; error: string };

function parseInstantStatusBody(
  body: InstantPremiumStatusApiResponse
): InstantPremiumStatusResponse | null {
  if ("availability" in body && body.availability === "ok") {
    return body;
  }
  if ("projectId" in body && "segments" in body && !("availability" in body)) {
    return body as unknown as InstantPremiumStatusResponse;
  }
  return null;
}

export async function fetchInstantPremiumStatus(
  projectId: string
): Promise<InstantStatusFetchResult> {
  const res = await fetchSameOriginJson<InstantPremiumStatusApiResponse>(
    INSTANT_PREMIUM_STATUS_PATH(projectId)
  );
  if (res.networkError) {
    const err =
      typeof res.data === "object" &&
      res.data &&
      "error" in res.data &&
      typeof (res.data as { error?: string }).error === "string"
        ? (res.data as { error: string }).error
        : "network error";
    return { kind: "network", error: err };
  }
  const parsed = parseInstantStatusBody(res.data);
  if (res.ok && parsed) {
    return { kind: "ok", data: parsed };
  }
  return { kind: "api", body: res.data, status: res.status };
}

export type ProjectDetailFetchResult =
  | { kind: "ok"; data: InstantPremiumStatusResponse }
  | { kind: "auth"; status: number }
  | { kind: "not_found"; status: number }
  | { kind: "error"; status: number; error: string }
  | { kind: "network"; error: string };

/** Detail fallback — only when instant status is unavailable; same-origin relative URL. */
export async function fetchAnimationProjectDetail(
  projectId: string
): Promise<
  SameOriginJsonResult<AnimationProjectDetailResponse & { error?: string }>
> {
  return fetchSameOriginJson<AnimationProjectDetailResponse & { error?: string }>(
    ANIMATION_PROJECT_DETAIL_PATH(projectId)
  );
}

export async function fetchInstantStatusFromProjectDetail(
  projectId: string
): Promise<ProjectDetailFetchResult> {
  const res = await fetchSameOriginJson<AnimationProjectDetailResponse & { error?: string }>(
    ANIMATION_PROJECT_DETAIL_PATH(projectId)
  );
  if (res.networkError) {
    const err =
      typeof res.data?.error === "string" ? res.data.error : "network error";
    return { kind: "network", error: err };
  }
  if (res.status === 401 || res.status === 403) {
    return { kind: "auth", status: res.status };
  }
  if (res.status === 404) {
    return { kind: "not_found", status: res.status };
  }
  if (!res.ok) {
    return {
      kind: "error",
      status: res.status,
      error: res.data?.error ?? `HTTP ${res.status}`,
    };
  }
  const mapped = instantStatusFromProjectDetail(projectId, res.data);
  if (!mapped) {
    return { kind: "error", status: res.status, error: "Could not map project detail to status." };
  }
  return {
    kind: "ok",
    data: mapped,
  };
}
