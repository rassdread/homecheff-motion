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

  const displayName = email.split("@")[0] ?? email;

  return (
    <div
      className="flex max-w-full flex-shrink-0 flex-col items-stretch gap-2 sm:max-w-none sm:flex-row sm:items-center sm:justify-end"
      data-testid="app-shell-user-bar"
    >
      <div className="min-w-0 rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-right backdrop-blur-sm">
        <p className="truncate text-sm font-semibold text-white">{displayName}</p>
        <p
          className={`truncate text-xs text-white/85 ${!isActive ? "opacity-50" : ""}`}
          title={email}
        >
          {email}
        </p>
        <span
          className={`mt-1 inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${roleBadgeClass(normalizedRole)}`}
        >
          {t(roleLabelKey(normalizedRole))}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {normalizedRole === "admin" ?
          <Link href="/admin" prefetch={false} className={studioVisual.btnGhost}>
            {t("nav.admin")}
          </Link>
        : null}
        <button type="button" onClick={() => void handleLogout()} className={studioVisual.btnGhost}>
          {t("nav.logout")}
        </button>
      </div>
    </div>
  );
}
