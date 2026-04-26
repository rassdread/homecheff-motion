"use client";

import Link from "next/link";
import { useCallback } from "react";
import { getActiveTranslator } from "@/i18n";
import { useAuthSession } from "@/hooks/use-auth-session";

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
    return "border-violet-200 bg-violet-50 text-violet-800";
  }
  if (role === "power") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }
  return "border-zinc-200 bg-zinc-100 text-zinc-600";
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
  const t = getActiveTranslator();
  const session = useAuthSession();

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* still navigate */
    }
    window.location.href = "/login";
  }, []);

  if (!session.resolved) {
    return (
      <span className="hidden h-9 w-24 animate-pulse rounded-full bg-zinc-100 sm:block" aria-hidden />
    );
  }

  if (!session.user) {
    return (
      <div className="flex flex-shrink-0 items-center gap-2">
        <Link
          href="/login"
          className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-emerald-50 sm:px-4 sm:py-2 sm:text-sm"
        >
          {t("nav.login")}
        </Link>
        <Link
          href="/signup"
          className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 sm:px-4 sm:py-2 sm:text-sm"
        >
          {t("nav.signup")}
        </Link>
      </div>
    );
  }

  const { email, role, isActive } = session.user;
  const normalizedRole = role === "admin" || role === "power" ? role : "user";

  return (
    <div className="flex max-w-[min(100%,22rem)] flex-shrink-0 flex-col items-end gap-1.5 sm:max-w-none sm:flex-row sm:items-center sm:gap-2">
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        <span
          className={`truncate text-xs text-zinc-700 sm:text-sm ${!isActive ? "opacity-60" : ""}`}
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
          <Link
            href="/admin"
            className="shrink-0 rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs font-medium text-violet-800 transition-colors hover:bg-violet-50 sm:px-3 sm:py-1.5 sm:text-sm"
          >
            {t("nav.admin")}
          </Link>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => void handleLogout()}
        className="shrink-0 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 sm:px-3 sm:py-1.5 sm:text-sm"
      >
        {t("nav.logout")}
      </button>
    </div>
  );
}
