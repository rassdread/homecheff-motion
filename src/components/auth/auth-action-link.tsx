"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { loginHref } from "@/lib/auth-login-href";

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
  prefetch?: boolean;
};

/** Navigates to `href` when signed in; otherwise sends the user through login with that intent. */
export function AuthActionLink({ href, className, children, prefetch = false }: Props) {
  const session = useAuthSession();
  const target = session.resolved && session.user ? href : loginHref(href);

  return (
    <Link href={target} prefetch={prefetch} className={className} aria-busy={!session.resolved}>
      {children}
    </Link>
  );
}
