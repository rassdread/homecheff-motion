export type CopilotWizardNavigationLog = {
  copilotAction?: string;
  targetRoute: string;
  normalizedRoute: string;
  workflowType?: string | null;
  wizardType?: string | null;
  queryParams: Record<string, string>;
  routeExists: boolean;
  redirectReason?: string | null;
};

export function parseRouteQueryParams(route: string): Record<string, string> {
  try {
    const url = new URL(route, "http://local");
    const out: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  } catch {
    return {};
  }
}

export function logCopilotWizardNavigation(input: CopilotWizardNavigationLog): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  console.info("[copilot-wizard-navigation]", JSON.stringify(input));
}
