import {
  instantExportUserErrorMessage,
  postFullRerenderInstantProject,
} from "@/lib/instant-export-client";
import type { FullRerenderResponse } from "@/types/animation-api";

export type FullRerenderSource = "quick" | "editor";

export function isInstantPremiumTestMode(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return document.body.dataset.instantPremiumMode === "test";
}

export async function runQuickFullRerender(params: {
  projectId: string;
  confirmMessage: string;
  confirmMessageTestMode: string;
  abortedMessage: string;
  networkMessage: string;
  failedMessage: string;
}): Promise<
  | { ok: true; data: FullRerenderResponse; progressRoute: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; message: string }
> {
  const confirmMessage = isInstantPremiumTestMode()
    ? params.confirmMessageTestMode
    : params.confirmMessage;
  if (!window.confirm(confirmMessage)) {
    return { ok: false, cancelled: true };
  }

  const result = await postFullRerenderInstantProject(params.projectId, {
    rerenderSource: "quick",
  });

  if (result.networkError) {
    return {
      ok: false,
      cancelled: false,
      message: instantExportUserErrorMessage({
        kind: result.errorKind ?? "network",
        abortedMessage: params.abortedMessage,
        networkMessage: params.networkMessage,
        httpMessage: result.data.error,
      }),
    };
  }

  if (!result.ok) {
    return {
      ok: false,
      cancelled: false,
      message:
        result.data.fullRerender?.message ?? result.data.error ?? params.failedMessage,
    };
  }

  const progressRoute =
    result.data.fullRerender?.progressRoute ??
    `/animate/instant/progress?projectId=${encodeURIComponent(params.projectId)}`;

  return { ok: true, data: result.data, progressRoute };
}
