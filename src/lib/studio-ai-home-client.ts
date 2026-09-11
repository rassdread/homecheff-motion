/** Client helpers for AI-first Studio home — reuses existing APIs only. */

import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type { AssistantInterpretation } from "@/types/assistant-interpretation";
import type { Locale } from "@/i18n";

export type StudioCreditPreviewResponse = {
  ok: true;
  preview: {
    allowed: boolean;
    requiredCredits: number;
    confirmationRequired: boolean;
    reason: string | null;
    balanceAfter: number;
    upgradeSuggestion: string | null;
    actionType: string;
  };
};

export type StudioAiHomeInterpretResult = {
  interpretation: AssistantInterpretation | null;
  usedLlm: boolean;
  error?: string;
};

export async function previewStudioAiHomeCredits(actionType: string): Promise<{
  ok: boolean;
  preview?: StudioCreditPreviewResponse["preview"];
  error?: string;
  code?: string;
}> {
  try {
    const res = await fetch(sameOriginApiPath("/api/me/studio-credits/preview"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType }),
      cache: "no-store",
    });
    const data = (await res.json()) as
      | StudioCreditPreviewResponse
      | { error?: string; code?: string };
    if (!res.ok || !("ok" in data) || !data.ok) {
      return {
        ok: false,
        error: "error" in data ? data.error : "preview_failed",
        code: "code" in data ? data.code : undefined,
      };
    }
    return { ok: true, preview: data.preview };
  } catch {
    return { ok: false, error: "network" };
  }
}

export async function interpretStudioAiHomePrompt(input: {
  message: string;
  locale: Locale;
}): Promise<StudioAiHomeInterpretResult> {
  const message = input.message.trim();
  if (!message) {
    return { interpretation: null, usedLlm: false };
  }
  try {
    const res = await fetch(sameOriginApiPath("/api/assistant/interpret"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, locale: input.locale === "en" ? "en" : "nl" }),
      cache: "no-store",
    });
    if (!res.ok) {
      return { interpretation: null, usedLlm: false, error: `http_${res.status}` };
    }
    const data = (await res.json()) as {
      interpretation?: AssistantInterpretation | null;
      usedLlm?: boolean;
    };
    return {
      interpretation: data.interpretation ?? null,
      usedLlm: Boolean(data.usedLlm),
    };
  } catch {
    return { interpretation: null, usedLlm: false, error: "network" };
  }
}

export type StudioBrandKitListItem = {
  id: string;
  name: string;
  description?: string;
  kit?: { logoUrl?: string | null };
};

export async function fetchStudioBrandKitsForHome(): Promise<StudioBrandKitListItem[]> {
  try {
    const res = await fetchSameOriginJson<{ brandKits: StudioBrandKitListItem[] }>(
      sameOriginApiPath("/api/studio/library/brand-kits")
    );
    if (!res.ok) return [];
    return res.data.brandKits ?? [];
  } catch {
    return [];
  }
}
