"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { GrowthSidebar } from "@/components/growth/growth-sidebar";
import { StudioCopilotResizeHandle } from "@/components/assistant/studio-copilot-resize-handle";
import { useHomeCheffAssistant } from "@/components/assistant/homecheff-assistant-provider";
import { growthSidebarLayoutClasses, GROWTH_SIDEBAR_HEADER_VAR } from "@/lib/growth-sidebar-layout";
import { shouldShowSideCopilotPanel } from "@/lib/studio-copilot-layout-storage";

type Props = {
  children: ReactNode;
  showSidebar: boolean;
};

export function GrowthSidebarLayout({ children, showSidebar }: Props) {
  const pathname = usePathname();
  const { copilotLayout, setCopilotWidth } = useHomeCheffAssistant();

  if (!showSidebar) {
    return <>{children}</>;
  }

  const showSidePanel = shouldShowSideCopilotPanel(copilotLayout, pathname);

  return (
    <div
      className={growthSidebarLayoutClasses.container}
      data-testid="growth-sidebar-layout"
      data-growth-sidebar-layout="true"
      data-studio-copilot-collapsed={copilotLayout.collapsed ? "true" : "false"}
    >
      <main className={growthSidebarLayoutClasses.main} data-testid="growth-sidebar-main">
        {children}
      </main>
      {showSidePanel ? (
        <div
          className={`${growthSidebarLayoutClasses.sidebarColumn} relative`}
          style={{ width: copilotLayout.width, maxWidth: copilotLayout.width }}
          data-testid="growth-sidebar-column"
          data-studio-copilot-placement={copilotLayout.placement}
        >
          <StudioCopilotResizeHandle onResize={setCopilotWidth} />
          <GrowthSidebar />
        </div>
      ) : null}
    </div>
  );
}

export { GROWTH_SIDEBAR_HEADER_VAR };
