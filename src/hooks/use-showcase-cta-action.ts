"use client";

import { useCallback, useEffect } from "react";
import { useOptionalHomeCheffAssistant } from "@/components/assistant/homecheff-assistant-provider";
import { useAuthSession } from "@/hooks/use-auth-session";
import { loginHref } from "@/lib/auth-login-href";
import type { HomeCheffExample } from "@/lib/homecheff-examples";
import {
  consumeShowcaseAssistantPending,
  storeShowcaseAssistantPending,
} from "@/lib/showcase-assistant-pending";

export function useShowcaseCtaAction() {
  const session = useAuthSession();
  const assistant = useOptionalHomeCheffAssistant();
  const isAuthenticated = Boolean(session.resolved && session.user);

  useEffect(() => {
    if (!isAuthenticated || !assistant || !session.resolved) {
      return;
    }
    const pending = consumeShowcaseAssistantPending();
    if (pending) {
      assistant.setOpen(true);
      assistant.sendMessage(pending);
    }
  }, [isAuthenticated, assistant, session.resolved]);

  return useCallback(
    (example: HomeCheffExample) => {
      if (example.assistantPrompt?.trim()) {
        if (!isAuthenticated) {
          storeShowcaseAssistantPending(example.assistantPrompt);
          window.location.href = loginHref(
            typeof window !== "undefined" ? window.location.pathname : "/"
          );
          return;
        }
        assistant?.setOpen(true);
        assistant?.sendMessage(example.assistantPrompt);
        return;
      }
      if (example.ctaHref?.trim()) {
        window.location.href = example.ctaHref.trim();
      }
    },
    [assistant, isAuthenticated]
  );
}
