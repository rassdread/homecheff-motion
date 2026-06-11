"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { invalidateAuthSessionCache } from "@/lib/auth-session-client";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";
import { studioVisual } from "@/lib/studio-visual-tokens";

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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* still navigate */
    }
    invalidateAuthSessionCache();
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

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

  const { email, role } = session.user;
  const normalizedRole = role === "admin" || role === "power" ? role : "user";
  const displayName = (email.split("@")[0] ?? email).replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div ref={rootRef} className="relative flex-shrink-0" data-testid="app-shell-user-bar">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={studioVisual.userPill}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="max-w-[8rem] truncate font-semibold text-white">{displayName}</span>
        <span
          className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadgeClass(normalizedRole)}`}
        >
          {t(roleLabelKey(normalizedRole))}
        </span>
        <span className="text-white/60" aria-hidden>
          ▼
        </span>
      </button>

      {open ?
        <div
          className={`absolute right-0 z-50 mt-2 min-w-[14rem] ${studioVisual.userDropdown}`}
          role="menu"
        >
          <p className="truncate px-3 py-2 text-xs text-white/70" title={email}>
            {email}
          </p>
          {normalizedRole === "admin" ?
            <Link
              href="/admin"
              prefetch={false}
              className={studioVisual.userDropdownItem}
              onClick={() => setOpen(false)}
            >
              {t("nav.admin")}
            </Link>
          : null}
          <button
            type="button"
            className={`${studioVisual.userDropdownItem} w-full text-left`}
            onClick={() => void handleLogout()}
          >
            {t("nav.logout")}
          </button>
        </div>
      : null}
    </div>
  );
}
