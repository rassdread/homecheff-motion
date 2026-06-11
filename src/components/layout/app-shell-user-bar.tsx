"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { invalidateAuthSessionCache } from "@/lib/auth-session-client";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";
import { studioVisual } from "@/lib/studio-visual-tokens";

function shortenEmail(email: string, maxLen = 30): string {
  if (email.length <= maxLen) {
    return email;
  }
  const at = email.indexOf("@");
  if (at < 1) {
    return `${email.slice(0, maxLen - 1)}…`;
  }
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length <= 12) {
    return `${local}@${domain.slice(0, 8)}…`;
  }
  return `${local.slice(0, 10)}…@${domain}`;
}

function roleBadgeClass(role: string): string {
  if (role === "admin") {
    return studioVisual.adminBadge;
  }
  if (role === "power") {
    return studioVisual.roleBadgePower;
  }
  return studioVisual.roleBadgeUser;
}

function roleLabelKey(role: string): "nav.role.admin" | "nav.role.power" | "nav.role.user" {
  if (role === "admin") {
    return "nav.role.admin";
  }
  if (role === "power") {
    return "nav.role.power";
  }
  return "nav.role.user";
}

export function AppShellUserBar() {
  const t = useActiveTranslator();
  const session = useAuthSession();

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* still navigate */
    }
    invalidateAuthSessionCache();
    window.location.href = "/login";
  }, []);

  if (!session.resolved) {
    return (
      <span
        className="hidden h-9 w-24 animate-pulse rounded-full bg-white/10 sm:block"
        aria-hidden
      />
    );
  }

  if (!session.user) {
    const suiteNav = isHomeCheffProductSuiteNavEnabled();
    return (
      <div className="flex flex-shrink-0 items-center gap-2">
        <Link href="/login" prefetch={false} className={studioVisual.btnSecondary}>
          {t("nav.login")}
        </Link>
        <Link
          href={suiteNav ? "/signup?next=%2Feditor" : "/signup"}
          prefetch={false}
          className={studioVisual.btnPrimary}
        >
          {t(suiteNav ? "universe.public.startCreating" : "nav.getStarted")}
        </Link>
      </div>
    );
  }

  const { email, role, isActive } = session.user;
  const normalizedRole = role === "admin" || role === "power" ? role : "user";

  return (
    <div className="flex max-w-[min(100%,22rem)] flex-shrink-0 flex-col items-end gap-1.5 sm:max-w-none sm:flex-row sm:items-center sm:gap-2">
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        <Link
          href="/mijn-verbruik"
          prefetch={false}
          className={`hidden sm:inline-flex ${studioVisual.btnGhost} text-[10px] sm:text-xs`}
        >
          {t("nav.usage")}
        </Link>
        <span
          className={`${studioVisual.userEmail} ${!isActive ? "opacity-50" : ""}`}
          title={email}
        >
          {shortenEmail(email)}
        </span>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${roleBadgeClass(normalizedRole)}`}
        >
          {t(roleLabelKey(normalizedRole))}
        </span>
        {normalizedRole === "admin" ? (
          <Link href="/admin" prefetch={false} className={studioVisual.btnGhost}>
            {t("nav.admin")}
          </Link>
        ) : null}
      </div>
      <button type="button" onClick={() => void handleLogout()} className={studioVisual.btnGhost}>
        {t("nav.logout")}
      </button>
    </div>
  );
}
