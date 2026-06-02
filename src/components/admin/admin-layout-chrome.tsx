"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useActiveTranslator } from "@/i18n/client";

type AdminLayoutChromeProps = {
  forbidden?: boolean;
  children: ReactNode;
};

export function AdminLayoutChrome({ forbidden = false, children }: AdminLayoutChromeProps) {
  const t = useActiveTranslator();

  if (forbidden) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-xl font-semibold text-zinc-900">{t("admin.forbiddenTitle")}</h1>
        <p className="mt-2 text-zinc-600">{t("admin.forbiddenDescription")}</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-emerald-700 underline">
          {t("admin.backHome")}
        </Link>
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <nav className="mb-8 flex flex-wrap gap-4 border-b border-zinc-200 pb-4 text-sm font-medium text-zinc-700">
        <Link href="/admin" className="hover:text-emerald-800">
          {t("admin.nav.dashboard")}
        </Link>
        <Link href="/admin/invites" className="hover:text-emerald-800">
          {t("admin.nav.invites")}
        </Link>
        <Link href="/admin/users" className="hover:text-emerald-800">
          {t("admin.nav.users")}
        </Link>
      </nav>
      {children}
    </div>
  );
}
