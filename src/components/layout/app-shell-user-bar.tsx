"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { GlobalCreditIndicator } from "@/components/billing/global-credit-indicator";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { useAuthSession } from "@/hooks/use-auth-session";
import { invalidateAuthSessionCache } from "@/lib/auth-session-client";
import {
  clearStudioIdentityBoundClientResidue,
  postStudioAuthChannel,
} from "@/lib/identity/studio-session-identity-channel";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";
import { studioVisual } from "@/lib/studio-visual-tokens";

type AccountMenuItem = {
  href: string;
  labelKey: TranslationKey;
  adminOnly?: boolean;
};

const ACCOUNT_MENU_ITEMS: AccountMenuItem[] = [
  { href: "/account", labelKey: "account.nav.profile" },
  { href: "/account/billing", labelKey: "account.nav.billing" },
  { href: "/usage", labelKey: "account.nav.usage" },
  { href: "/account/billing?tab=subscription", labelKey: "account.nav.subscription" },
  { href: "/account/settings", labelKey: "account.nav.settings" },
  { href: "/admin", labelKey: "nav.admin", adminOnly: true },
];

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

type Props = {
  compact?: boolean;
};

export function AppShellUserBar({ compact = false }: Props) {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* still navigate */
    }
    clearStudioIdentityBoundClientResidue();
    invalidateAuthSessionCache();
    postStudioAuthChannel({ type: "logout" });
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
    <div ref={rootRef} className="relative shrink-0" data-testid="app-shell-user-bar">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={studioVisual.userPill}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("account.nav.profile")}
      >
        {compact ? (
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white"
            aria-hidden
          >
            {displayName.slice(0, 1)}
          </span>
        ) : (
          <>
            <span className="max-w-[8rem] truncate font-semibold text-white">{displayName}</span>
            <span
              className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadgeClass(normalizedRole)}`}
            >
              {t(roleLabelKey(normalizedRole))}
            </span>
            <span className="text-white/60" aria-hidden>
              ▼
            </span>
          </>
        )}
      </button>

      {open ?
        <div
          className={`absolute right-0 z-50 mt-2 min-w-[14rem] ${studioVisual.userDropdown}`}
          role="menu"
        >
          <p className="truncate px-3 py-2 text-xs text-white/70" title={email}>
            {email}
          </p>
          <div className="px-3 pb-2 lg:hidden">
            <GlobalCreditIndicator variant="compact" />
          </div>
          <a
            href="https://homecheff.eu/mijn-homecheff"
            className={studioVisual.userDropdownItem}
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            Mijn HomeCheff
          </a>
          <a
            href="https://homecheff.eu/affiliate"
            className={studioVisual.userDropdownItem}
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            HomeCheff Affiliate
          </a>
          {ACCOUNT_MENU_ITEMS.map((item) => {
            if (item.adminOnly && normalizedRole !== "admin") {
              return null;
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={studioVisual.userDropdownItem}
                onClick={() => setOpen(false)}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
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
