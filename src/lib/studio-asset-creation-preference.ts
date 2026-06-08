/** Persisted preference: skip guided asset creation wizard. */

const STORAGE_KEY = "hc.studio.assetCreation.skipWizard";

export function readSkipAssetCreationWizard(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSkipAssetCreationWizard(skip: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (skip) {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

export function shouldShowAssetCreationWizard(params: {
  skipWizardPreference: boolean;
  guidedQueryParam: boolean;
  hasDecisionPrefill: boolean;
}): boolean {
  if (params.hasDecisionPrefill) {
    return false;
  }
  if (params.guidedQueryParam) {
    return true;
  }
  if (params.skipWizardPreference) {
    return false;
  }
  return true;
}
