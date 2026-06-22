"use client";

import { useActiveTranslator } from "@/i18n/client";
import { MotionBottomSheet } from "@/components/ui/motion-bottom-sheet";
import { useHomeCheffAssistant } from "@/components/assistant/homecheff-assistant-provider";
import { GrowthSidebar } from "@/components/growth/growth-sidebar";

/** Mobile-only FAB + bottom sheet. Desktop uses the permanent Growth Sidebar layout. */
export function HomeCheffAssistant() {
  const t = useActiveTranslator();
  const { open, setOpen, copilotLayout, copilotLayoutHydrated } = useHomeCheffAssistant();

  if (copilotLayoutHydrated && copilotLayout.collapsed) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-40 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#006D52]/35 bg-gradient-to-r from-[#006D52] to-[#0067B1] px-4 text-xs font-semibold text-white shadow-lg lg:hidden"
        data-testid="homecheff-assistant-fab-mobile"
        onClick={() => setOpen(true)}
      >
        {t("assistant.fabShort" as never)}
      </button>

      <MotionBottomSheet
        open={open}
        title={t("assistant.title" as never)}
        onClose={() => setOpen(false)}
      >
        <div className="max-h-[min(78dvh,720px)] overflow-y-auto">
          <GrowthSidebar variant="sheet" onClose={() => setOpen(false)} />
        </div>
      </MotionBottomSheet>
    </>
  );
}
