"use client";

import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

export type MotionIntentId = "product" | "story" | "social" | "presentation" | "showcase";

const INTENTS: MotionIntentId[] = ["product", "story", "social", "presentation", "showcase"];

export const MOTION_INTENT_STORAGE_KEY = "hc-motion-intent-v1";

type Props = {
  onSelect: (intent: MotionIntentId) => void;
};

export function MotionIntentGate({ onSelect }: Props) {
  const t = useActiveTranslator();

  return (
    <section className={`mx-auto max-w-2xl space-y-4 p-6 ${studioVisual.cardOnDarkMuted}`} data-testid="motion-intent-gate">
      <h2 className={`text-lg font-bold ${studioVisual.headingOnDark}`}>{t("motion.intent.title" as never)}</h2>
      <p className={`text-sm ${studioVisual.bodyOnDark}`}>{t("motion.intent.lead" as never)}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {INTENTS.map((intent) => (
          <button
            key={intent}
            type="button"
            onClick={() => onSelect(intent)}
            className={`min-h-14 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/10`}
          >
            {t(`motion.intent.${intent}` as never)}
          </button>
        ))}
      </div>
    </section>
  );
}

export function readMotionIntent(): MotionIntentId | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(MOTION_INTENT_STORAGE_KEY);
  return raw as MotionIntentId | null;
}

export function storeMotionIntent(intent: MotionIntentId): void {
  sessionStorage.setItem(MOTION_INTENT_STORAGE_KEY, intent);
}
