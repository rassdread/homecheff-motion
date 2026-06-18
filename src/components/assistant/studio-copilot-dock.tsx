"use client";

import { StudioCopilotContextBar } from "@/components/assistant/studio-copilot-context-bar";
import { StudioCopilotHeader } from "@/components/assistant/studio-copilot-header";
import { StudioCopilotQuickActions } from "@/components/assistant/studio-copilot-quick-actions";
import { AssistantChatPanel } from "@/components/assistant/assistant-chat-panel";
import { useHomeCheffAssistant } from "@/components/assistant/homecheff-assistant-provider";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  onApplyChangePlan?: (prompt: string) => void;
};

/**
 * Docked Studio Copilot — replaces the editor AI Director block.
 * Uses the same provider state as the side panel.
 */
export function StudioCopilotDock({ onApplyChangePlan }: Props) {
  const t = useActiveTranslator();
  const { sendMessage, copilotLayout, setCopilotPlacement } = useHomeCheffAssistant();

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    if (onApplyChangePlan) {
      onApplyChangePlan(trimmed);
    }
    sendMessage(trimmed);
  };

  return (
    <section
      className={`${studioVisual.editorSurface} overflow-hidden`}
      data-testid="studio-copilot-dock"
    >
      <StudioCopilotHeader
        placement={copilotLayout.placement}
        onPlacementChange={setCopilotPlacement}
        compact
      />
      <StudioCopilotContextBar compact />
      <div className="space-y-2 px-3 py-2">
        <StudioCopilotQuickActions onSelect={handleSubmit} />
        <div className="max-h-[min(42vh,480px)] min-h-[200px]">
          <AssistantChatPanel placement="dock" compact />
        </div>
        <p className="text-[10px] text-zinc-400">{t("studioCopilot.dock.hint" as never)}</p>
      </div>
    </section>
  );
}
