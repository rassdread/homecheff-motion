/**
 * S2G finish analytics — no PII.
 */

export type StudioFinishAnalyticsEvent =
  | "studio_finish_view"
  | "studio_finish_blocker_click"
  | "studio_finish_start"
  | "studio_finish_success"
  | "studio_finish_failure"
  | "studio_finish_download"
  | "studio_finish_new_version"
  | "studio_finish_homecheff"
  | "studio_finish_growth_return";

export function trackStudioFinishEvent(
  event: StudioFinishAnalyticsEvent,
  props?: Record<string, string | number | boolean | null | undefined>
): void {
  if (typeof window === "undefined") return;
  try {
    const detail = { event, ...props, ts: Date.now() };
    window.dispatchEvent(new CustomEvent("homecheff:studio-finish", { detail }));
    const w = window as Window & {
      dataLayer?: Array<Record<string, unknown>>;
      gtag?: (...args: unknown[]) => void;
    };
    w.dataLayer?.push({ event, ...props });
  } catch {
    /* ignore */
  }
}
