"use client";

import { useAuthSession } from "@/hooks/use-auth-session";
import { loginHref } from "@/lib/auth-login-href";

/** Resolves a destination to itself when signed in, or a login URL preserving intent. */
export function useAuthActionHref(href: string): string {
  const session = useAuthSession();
  if (!session.resolved) {
    return loginHref(href);
  }
  return session.user ? href : loginHref(href);
}
