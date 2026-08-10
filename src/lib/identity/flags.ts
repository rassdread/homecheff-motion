/**
 * SP.2B — Central Identity feature flags (Studio consumer).
 * Defaults SAFE/OFF — legacy Studio login remains available until flags are enabled.
 */

export const CENTRAL_IDENTITY_FLAG_NAMES = [
  "CENTRAL_IDENTITY_ENABLED",
  "CENTRAL_SSO_ENABLED",
  "CENTRAL_SSO_JIT_PROVISIONING",
  "LEGACY_STUDIO_LOGIN_ENABLED",
  "CENTRAL_IDENTITY_REQUIRED",
] as const;

function envBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return defaultValue;
}

export function getCentralIdentityFlags() {
  return {
    CENTRAL_IDENTITY_ENABLED: envBool("CENTRAL_IDENTITY_ENABLED", false),
    CENTRAL_SSO_ENABLED: envBool("CENTRAL_SSO_ENABLED", false),
    CENTRAL_SSO_JIT_PROVISIONING: envBool("CENTRAL_SSO_JIT_PROVISIONING", false),
    LEGACY_STUDIO_LOGIN_ENABLED: envBool("LEGACY_STUDIO_LOGIN_ENABLED", true),
    CENTRAL_IDENTITY_REQUIRED: envBool("CENTRAL_IDENTITY_REQUIRED", false),
  } as const;
}

export type CentralIdentityFlags = ReturnType<typeof getCentralIdentityFlags>;

export function isCentralSsoLive(flags: CentralIdentityFlags = getCentralIdentityFlags()): boolean {
  return flags.CENTRAL_IDENTITY_ENABLED && flags.CENTRAL_SSO_ENABLED;
}

export function isLegacyStudioLoginEnabled(
  flags: CentralIdentityFlags = getCentralIdentityFlags(),
): boolean {
  return flags.LEGACY_STUDIO_LOGIN_ENABLED && !flags.CENTRAL_IDENTITY_REQUIRED;
}

export function isStudioJitProvisioningEnabled(
  flags: CentralIdentityFlags = getCentralIdentityFlags(),
): boolean {
  return isCentralSsoLive(flags) && flags.CENTRAL_SSO_JIT_PROVISIONING;
}
