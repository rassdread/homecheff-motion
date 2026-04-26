"use client";

import { useEffect, useState } from "react";

export type AuthSessionUser = {
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
        const res = await fetch("/api/auth/session");
        if (!res.ok || cancelled) {
          if (!cancelled) {
            setState({ resolved: true, user: null });
          }
          return;
        }
        const data = (await res.json()) as {
          user: { email: string; role: string; isActive: boolean } | null;
        };
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
