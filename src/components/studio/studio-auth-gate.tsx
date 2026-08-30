"use client";

import { ReactNode, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import type { TranslationKey } from "@/i18n";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";

type StudioAuthGateProps = {
  children: ReactNode;
  authTitleKey?: TranslationKey;
  authBodyKey?: TranslationKey;
};

/**
 * Soft private gate for Studio workspace surfaces.
 * SP.2B.5: unauthenticated → ONE silent SSO attempt via /auth/sso/silent
 * (loop/skip cookies fall through to /login).
 */
export function StudioAuthGate({ children }: StudioAuthGateProps) {
  const session = useAuthSession();
  const pathname = usePathname();
  const silentHref = `/auth/sso/silent?returnTo=${encodeURIComponent(pathname || "/")}&mode=ecosystem`;
  const started = useRef(false);

  useEffect(() => {
    if (!session.resolved || session.user || started.current) return;
    started.current = true;
    window.location.assign(silentHref);
  }, [session.resolved, session.user, silentHref]);

  if (!session.resolved || !session.user) {
    return (
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
          <HomeCheffOrbitLoader state="loading" size="md" />
          <p className="mt-6 text-sm font-semibold text-emerald-900">HomeCheff</p>
          <p className="mt-1 text-xs tracking-wide text-emerald-800/80">Everybody Eats.</p>
          <p className="mt-4 text-sm text-zinc-600">Je HomeCheff-account wordt geopend…</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
