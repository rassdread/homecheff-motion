/**
 * Studio-local HC flags — ALL default OFF.
 * Central wallet spend never runs unless both credits + studio spend are enabled.
 */

function envBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return defaultValue;
}

export function getStudioHcFlags() {
  return {
    HC_CREDITS_ENABLED: envBool("HC_CREDITS_ENABLED", false),
    HC_STUDIO_SPEND_ENABLED: envBool("HC_STUDIO_SPEND_ENABLED", false),
    HC_SUBSCRIPTION_GRANTS_ENABLED: envBool("HC_SUBSCRIPTION_GRANTS_ENABLED", false),
    HC_PUBLIC_BALANCE_UI_ENABLED: envBool("HC_PUBLIC_BALANCE_UI_ENABLED", false),
    HC_MARKETPLACE_REDEMPTION_ENABLED: envBool("HC_MARKETPLACE_REDEMPTION_ENABLED", false),
  } as const;
}

export function isStudioCentralHcSpendEnabled(): boolean {
  const flags = getStudioHcFlags();
  return flags.HC_CREDITS_ENABLED && flags.HC_STUDIO_SPEND_ENABLED;
}
