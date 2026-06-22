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
export const BILLING_CONVERSION_MAX_EVENTS = 50;
export const BILLING_CONVERSION_MAX_SERIALIZED_BYTES = 100 * 1024;

let storageDisabledForSession = false;

function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return true;
  }
  return error instanceof Error && error.name === "QuotaExceededError";
}

function readEvents(): BillingConversionEvent[] {
  if (typeof window === "undefined" || storageDisabledForSession) {
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

/** Trim to event count + serialized size limits (newest events first). */
export function pruneBillingConversionEvents(events: BillingConversionEvent[]): BillingConversionEvent[] {
  let trimmed = events.slice(0, BILLING_CONVERSION_MAX_EVENTS);
  while (trimmed.length > 0) {
    const serialized = JSON.stringify(trimmed);
    if (serialized.length <= BILLING_CONVERSION_MAX_SERIALIZED_BYTES) {
      return trimmed;
    }
    trimmed = trimmed.slice(0, -1);
  }
  return [];
}

function tryPersistEvents(events: BillingConversionEvent[]): boolean {
  const payload = pruneBillingConversionEvents(events);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      return false;
    }

    const reduced = pruneBillingConversionEvents(payload.slice(0, Math.max(1, Math.floor(payload.length / 2))));
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
      return true;
    } catch {
      return false;
    }
  }
}

/** Persist billing conversion events without throwing. Returns false when storage is unavailable. */
export function safeWriteBillingConversionEvents(events: BillingConversionEvent[]): boolean {
  if (typeof window === "undefined" || storageDisabledForSession) {
    return false;
  }

  if (tryPersistEvents(events)) {
    return true;
  }

  storageDisabledForSession = true;
  return false;
}

function writeEvents(events: BillingConversionEvent[]): void {
  safeWriteBillingConversionEvents(events);
}

export function trackBillingConversionEvent(
  type: BillingConversionEventType,
  payload: Omit<BillingConversionEvent, "at" | "type"> = {}
): void {
  try {
    const events = readEvents();
    events.unshift({
      at: new Date().toISOString(),
      type,
      ...payload,
    });
    writeEvents(events);

    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(
          new CustomEvent("hc-billing-conversion", {
            detail: { type, ...payload },
          })
        );
      } catch {
        // Analytics must never break the app.
      }
    }
  } catch {
    // Analytics must never break the app.
  }
}

export function getBillingConversionEventCounts(): Record<BillingConversionEventType, number> {
  try {
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
  } catch {
    return {
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
  }
}

export function isBillingConversionAnalyticsStorageDisabled(): boolean {
  return storageDisabledForSession;
}

export function clearBillingConversionAnalyticsForTests(): void {
  storageDisabledForSession = false;
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
