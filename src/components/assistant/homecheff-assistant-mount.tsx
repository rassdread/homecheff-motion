"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HomeCheffAssistant } from "@/components/assistant/homecheff-assistant";
import { HomeCheffAssistantProvider } from "@/components/assistant/homecheff-assistant-provider";
import { StudioCopilotRestoreFab } from "@/components/assistant/studio-copilot-restore-fab";
import { GrowthSidebarLayout } from "@/components/growth/growth-sidebar-layout";
import {
  isHomeCheffAssistantEnabled,
  isHomeCheffAssistantRoute,
} from "@/lib/homecheff-assistant-flag";

type Props = {
  children: ReactNode;
};

export function HomeCheffAssistantMount({ children }: Props) {
  const pathname = usePathname();
  const enabled =
    isHomeCheffAssistantEnabled() && isHomeCheffAssistantRoute(pathname);

  if (!enabled) {
    return <div data-assistant-mount="false">{children}</div>;
  }

  return (
    <div data-assistant-mount="true">
      <HomeCheffAssistantProvider>
        <GrowthSidebarLayout showSidebar>{children}</GrowthSidebarLayout>
        <StudioCopilotRestoreFab />
        <HomeCheffAssistant />
      </HomeCheffAssistantProvider>
    </div>
  );
}
