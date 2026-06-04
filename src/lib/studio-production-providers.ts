/**
 * Studio V29 — provider env validation (no API calls).
 */

export type ProductionProviderId = "openai" | "elevenlabs" | "vidu";

export type ProviderConnectionStatus =
  | "connected"
  | "missing_api_key"
  | "unavailable"
  | "unknown";

export type ProductionProviderStatus = {
  id: ProductionProviderId;
  labelKey: string;
  status: ProviderConnectionStatus;
  statusLabelKey: string;
  detailKey: string | null;
  envKeys: string[];
};

export type ProductionProviderReport = {
  providers: ProductionProviderStatus[];
  checkedAt: string;
};

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function validateOpenAiProductionEnv(): ProductionProviderStatus {
  const apiKey = readEnv("OPENAI_API_KEY");
  const chatModel = readEnv("OPENAI_CHAT_MODEL");
  const imageModel = readEnv("OPENAI_IMAGE_MODEL");

  if (!apiKey) {
    return {
      id: "openai",
      labelKey: "studio.production.provider.openai",
      status: "missing_api_key",
      statusLabelKey: "studio.production.provider.status.missingKey",
      detailKey: "studio.production.provider.openai.missingKey",
      envKeys: ["OPENAI_API_KEY", "OPENAI_CHAT_MODEL", "OPENAI_IMAGE_MODEL"],
    };
  }

  if (!imageModel) {
    return {
      id: "openai",
      labelKey: "studio.production.provider.openai",
      status: "unavailable",
      statusLabelKey: "studio.production.provider.status.unavailable",
      detailKey: "studio.production.provider.openai.missingImageModel",
      envKeys: ["OPENAI_API_KEY", "OPENAI_CHAT_MODEL", "OPENAI_IMAGE_MODEL"],
    };
  }

  return {
    id: "openai",
    labelKey: "studio.production.provider.openai",
    status: "connected",
    statusLabelKey: "studio.production.provider.status.connected",
    detailKey: chatModel
      ? null
      : "studio.production.provider.openai.defaultChatModel",
    envKeys: ["OPENAI_API_KEY", "OPENAI_CHAT_MODEL", "OPENAI_IMAGE_MODEL"],
  };
}

export function validateElevenLabsProductionEnv(): ProductionProviderStatus {
  const apiKey = readEnv("ELEVENLABS_API_KEY");
  if (!apiKey) {
    return {
      id: "elevenlabs",
      labelKey: "studio.production.provider.elevenlabs",
      status: "missing_api_key",
      statusLabelKey: "studio.production.provider.status.missingKey",
      detailKey: "studio.production.provider.elevenlabs.missingKey",
      envKeys: ["ELEVENLABS_API_KEY"],
    };
  }
  return {
    id: "elevenlabs",
    labelKey: "studio.production.provider.elevenlabs",
    status: "connected",
    statusLabelKey: "studio.production.provider.status.connected",
    detailKey: null,
    envKeys: ["ELEVENLABS_API_KEY"],
  };
}

export function validateViduProductionEnv(): ProductionProviderStatus {
  const apiKey = readEnv("VIDU_API_KEY");
  if (!apiKey) {
    return {
      id: "vidu",
      labelKey: "studio.production.provider.vidu",
      status: "missing_api_key",
      statusLabelKey: "studio.production.provider.status.missingKey",
      detailKey: "studio.production.provider.vidu.missingKey",
      envKeys: ["VIDU_API_KEY"],
    };
  }
  return {
    id: "vidu",
    labelKey: "studio.production.provider.vidu",
    status: "connected",
    statusLabelKey: "studio.production.provider.status.connected",
    detailKey: null,
    envKeys: ["VIDU_API_KEY"],
  };
}

export function buildProductionProviderReport(): ProductionProviderReport {
  return {
    providers: [
      validateOpenAiProductionEnv(),
      validateElevenLabsProductionEnv(),
      validateViduProductionEnv(),
    ],
    checkedAt: new Date().toISOString(),
  };
}

export function providerBlocksProduction(
  report: ProductionProviderReport,
  options?: { voiceEnabled?: boolean; needsImages?: boolean; needsVideo?: boolean }
): boolean {
  const byId = new Map(report.providers.map((p) => [p.id, p]));
  if (options?.needsImages !== false) {
    const openai = byId.get("openai");
    if (openai && openai.status !== "connected") {
      return true;
    }
  }
  if (options?.voiceEnabled) {
    const eleven = byId.get("elevenlabs");
    if (eleven && eleven.status !== "connected") {
      return true;
    }
  }
  if (options?.needsVideo !== false) {
    const vidu = byId.get("vidu");
    if (vidu && vidu.status !== "connected") {
      return true;
    }
  }
  return false;
}
