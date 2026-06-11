"use client";

import { useMemo, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  loadPersistedUserCredits,
  resolveEditorUserAccess,
} from "@/lib/editor-generation-gate";

export function useEditorUserAccess() {
  const auth = useAuthSession();
  const [creditsOverride, setCreditsOverride] = useState<number | undefined>(() =>
    loadPersistedUserCredits()
  );

  const access = useMemo(
    () =>
      resolveEditorUserAccess({
        role: auth.user?.role,
        credits: creditsOverride,
      }),
    [auth.user?.role, creditsOverride]
  );

  return {
    access,
    setCredits: setCreditsOverride,
  };
}
