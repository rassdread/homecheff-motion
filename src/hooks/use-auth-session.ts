"use client";

import { useEffect, useState } from "react";
import { fetchAuthSessionJson } from "@/lib/auth-session-client";

export type AuthSessionUser = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
};

export type AuthSessionState =
  | { resolved: false; user: null }
  | { resolved: true; user: AuthSessionUser | null };

export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>({ resolved: false, user: null });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchAuthSessionJson();
        if (cancelled) {
          return;
        }
        if (!data.user) {
          setState({ resolved: true, user: null });
          return;
        }
        setState({
          resolved: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
            isActive: data.user.isActive !== false,
          },
        });
      } catch {
        if (!cancelled) {
          setState({ resolved: true, user: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
