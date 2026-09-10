/**
 * Addendum A — combined physical-orientation proof for iPhone Safari certification.
 * Do not treat screen.orientation.type as sole source of truth.
 */
import type { Page } from "playwright";

export type OrientationSignals = {
  innerWidth: number;
  innerHeight: number;
  visualViewportWidth: number | null;
  visualViewportHeight: number | null;
  matchMediaLandscape: boolean;
  matchMediaPortrait: boolean;
  screenOrientationType: string | null;
};

export type PhysicalOrientationProof = OrientationSignals & {
  /** Viewport-primary inference (ignores stale screen.orientation). */
  viewportOrientation: "portrait" | "landscape";
  /** Back-compat alias used by cert scripts. */
  orient: "portrait" | "landscape";
  safariOrientationDiscrepancy: boolean;
  safariDiscrepancyNote: string | null;
  portraitEvidencePass: boolean;
  landscapeEvidencePass: boolean;
};

export type OrientationGateContext = {
  studioNavVisible?: boolean;
  requireStudioLayout?: boolean;
};

/** Collect raw orientation signals from the live Safari page. */
export async function collectOrientationSignals(page: Page): Promise<OrientationSignals> {
  return page.evaluate(() => {
    const vv = window.visualViewport;
    const mmLandscape = window.matchMedia("(orientation: landscape)").matches;
    const mmPortrait = window.matchMedia("(orientation: portrait)").matches;
    const screenOrientationType =
      typeof screen !== "undefined" && "orientation" in screen
        ? String((screen.orientation as ScreenOrientation)?.type ?? "") || null
        : null;
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      visualViewportWidth: vv?.width ?? null,
      visualViewportHeight: vv?.height ?? null,
      matchMediaLandscape: mmLandscape,
      matchMediaPortrait: mmPortrait,
      screenOrientationType,
    };
  });
}

/** Evaluate addendum-A combined proof from collected signals. */
export function evaluatePhysicalOrientation(
  signals: OrientationSignals,
  ctx: OrientationGateContext = {}
): PhysicalOrientationProof {
  const viewportPortrait = signals.innerHeight >= signals.innerWidth;
  const viewportLandscape = signals.innerWidth > signals.innerHeight;

  const vvPortrait =
    signals.visualViewportWidth == null ||
    signals.visualViewportHeight == null ||
    signals.visualViewportHeight >= signals.visualViewportWidth;
  const vvLandscape =
    signals.visualViewportWidth == null ||
    signals.visualViewportHeight == null ||
    signals.visualViewportWidth > signals.visualViewportHeight;

  const mediaPortrait = signals.matchMediaPortrait || !signals.matchMediaLandscape;
  const mediaLandscape = signals.matchMediaLandscape || viewportLandscape;

  const layoutOk =
    ctx.requireStudioLayout !== true || ctx.studioNavVisible === true;

  const portraitEvidencePass =
    viewportPortrait && vvPortrait && mediaPortrait && layoutOk;
  const landscapeEvidencePass =
    viewportLandscape && vvLandscape && mediaLandscape && layoutOk;

  const viewportOrientation: "portrait" | "landscape" = viewportPortrait
    ? "portrait"
    : "landscape";

  const screenSaysPortrait = /portrait/i.test(signals.screenOrientationType ?? "");
  const screenSaysLandscape = /landscape/i.test(signals.screenOrientationType ?? "");
  const safariOrientationDiscrepancy =
    (screenSaysPortrait && viewportLandscape) ||
    (screenSaysLandscape && viewportPortrait);

  let safariDiscrepancyNote: string | null = null;
  if (safariOrientationDiscrepancy) {
    safariDiscrepancyNote =
      `screen.orientation=${signals.screenOrientationType ?? "n/a"} disagrees with viewport ` +
      `${signals.innerWidth}×${signals.innerHeight}` +
      (signals.visualViewportWidth != null
        ? ` visualViewport=${signals.visualViewportWidth}×${signals.visualViewportHeight}`
        : "");
  }

  return {
    ...signals,
    viewportOrientation,
    orient: viewportOrientation,
    safariOrientationDiscrepancy,
    safariDiscrepancyNote,
    portraitEvidencePass,
    landscapeEvidencePass,
  };
}

/** One-shot collect + evaluate for cert gates. */
export async function collectPhysicalOrientationProof(
  page: Page,
  ctx: OrientationGateContext = {}
): Promise<PhysicalOrientationProof> {
  const signals = await collectOrientationSignals(page);
  return evaluatePhysicalOrientation(signals, ctx);
}

/** Compact log line for cert scripts. */
export function formatOrientationProof(o: PhysicalOrientationProof): string {
  const vv =
    o.visualViewportWidth != null
      ? ` vv=${o.visualViewportWidth}×${o.visualViewportHeight}`
      : "";
  const disc = o.safariOrientationDiscrepancy ? " SAFARI_DISCREPANCY" : "";
  return (
    `${o.viewportOrientation} ${o.innerWidth}×${o.innerHeight}${vv} ` +
    `mmL=${o.matchMediaLandscape} mmP=${o.matchMediaPortrait} so=${o.screenOrientationType ?? "n/a"}${disc}`
  );
}
