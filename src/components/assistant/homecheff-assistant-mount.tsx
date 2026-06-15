"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { HomeCheffAssistant } from "@/components/assistant/homecheff-assistant";
import { HomeCheffAssistantProvider } from "@/components/assistant/homecheff-assistant-provider";
import {
  isHomeCheffAssistantEnabled,
  isHomeCheffAssistantRoute,
} from "@/lib/homecheff-assistant-flag";

function HomeCheffAssistantReady() {
  return (
    <HomeCheffAssistantProvider>
      <HomeCheffAssistant />
    </HomeCheffAssistantProvider>
  );
}

export function HomeCheffAssistantMount() {
  const pathname = usePathname();

  if (!isHomeCheffAssistantEnabled() || !isHomeCheffAssistantRoute(pathname)) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <HomeCheffAssistantReady />
    </Suspense>
  );
}
