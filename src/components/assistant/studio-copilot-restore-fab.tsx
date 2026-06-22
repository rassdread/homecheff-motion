"use client";

import { usePathname } from "next/navigation";
import { useHomeCheffAssistant } from "@/components/assistant/homecheff-assistant-provider";
import { useActiveTranslator } from "@/i18n/client";

/** Floating restore control when Copilot is minimized. */
export function StudioCopilotRestoreFab() {
  const t = useActiveTranslator();
  const pathname = usePathname();
  const { copilotLayout, copilotLayoutHydrated, restoreCopilot, setOpen } = useHomeCheffAssistant();

  if (!copilotLayoutHydrated || !copilotLayout.collapsed) {
    return null;
  }

  const handleRestore = () => {
    restoreCopilot(pathname);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setOpen(true);
    }
  };

  return (
    <button
      type="button"
      className="fixed bottom-4 right-4 z-50 inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-[#006D52]/35 bg-gradient-to-r from-[#006D52] to-[#0067B1] px-4 text-xs font-semibold text-white shadow-lg pb-[max(0.25rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))]"
      aria-label={t("studioCopilot.restore" as never)}
      title={t("studioCopilot.restore" as never)}
      data-testid="studio-copilot-restore-fab"
      onClick={handleRestore}
    >
      {t("studioCopilot.restoreShort" as never)}
    </button>
  );
}
