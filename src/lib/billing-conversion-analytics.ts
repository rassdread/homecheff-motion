export type BillingConversionEventType =
  | "buy_credits_clicked"
  | "buy_credits_click"
  | "upgrade_plan_clicked"
  | "upgrade_plan_click"
  | "low_credit_banner_clicked"
  | "low_credit_cta_click"
  | "insufficient_credits_seen"
  | "credit_pack_selected"
  | "subscription_upgrade_selected"
  | "yearly_selected"
  | "monthly_selected"
  | "pricing_view"
  | "conversion_surface_impression";

export type BillingConversionEvent = {
  at: string;
  type: BillingConversionEventType;
  source?: string;
  packId?: string;
  planId?: string;
  availableCredits?: number;
};

const STORAGE_KEY = "hc-billing-conversion-analytics-v1";
const MAX_EVENTS = 500;

function readEvents(): BillingConversionEvent[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as BillingConversionEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEvents(events: BillingConversionEvent[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
}

export function trackBillingConversionEvent(
  type: BillingConversionEventType,
  payload: Omit<BillingConversionEvent, "at" | "type"> = {}
): void {
  const events = readEvents();
  events.unshift({
    at: new Date().toISOString(),
    type,
    ...payload,
  });
  writeEvents(events);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("hc-billing-conversion", {
        detail: { type, ...payload },
      })
    );
  }
}

export function getBillingConversionEventCounts(): Record<BillingConversionEventType, number> {
  const events = readEvents();
  const counts: Record<BillingConversionEventType, number> = {
    buy_credits_clicked: 0,
    buy_credits_click: 0,
    upgrade_plan_clicked: 0,
    upgrade_plan_click: 0,
    low_credit_banner_clicked: 0,
    low_credit_cta_click: 0,
    insufficient_credits_seen: 0,
    credit_pack_selected: 0,
    subscription_upgrade_selected: 0,
    yearly_selected: 0,
    monthly_selected: 0,
    pricing_view: 0,
    conversion_surface_impression: 0,
  };
  for (const event of events) {
    counts[event.type] += 1;
  }
  return counts;
}

export function clearBillingConversionAnalyticsForTests(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
