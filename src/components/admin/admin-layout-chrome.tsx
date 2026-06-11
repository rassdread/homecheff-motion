"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { ProductPageShell } from "@/components/layout/product-page-shell";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type AdminLayoutChromeProps = {
  forbidden?: boolean;
  children: ReactNode;
};

export function AdminLayoutChrome({ forbidden = false, children }: AdminLayoutChromeProps) {
  const t = useActiveTranslator();

  if (forbidden) {
    return (
      <ProductPageShell>
        <div className="mx-auto max-w-xl py-8">
          <h1 className="text-xl font-semibold text-white">{t("admin.forbiddenTitle")}</h1>
          <p className="mt-2 text-white/70">{t("admin.forbiddenDescription")}</p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-emerald-300 underline">
            {t("admin.backHome")}
          </Link>
        </div>
      </ProductPageShell>
    );
  }

  return (
    <ProductPageShell>
      <nav className="mb-8 flex flex-wrap gap-3 border-b border-white/15 pb-4 text-sm font-medium text-white/75">
        <Link href="/admin" className="rounded-full px-3 py-1 hover:bg-white/10 hover:text-white">
          {t("admin.nav.dashboard")}
        </Link>
        <Link href="/admin/invites" className="rounded-full px-3 py-1 hover:bg-white/10 hover:text-white">
          {t("admin.nav.invites")}
        </Link>
        <Link href="/admin/users" className="rounded-full px-3 py-1 hover:bg-white/10 hover:text-white">
          {t("admin.nav.users")}
        </Link>
        <Link href="/admin/render-analytics" className="rounded-full px-3 py-1 hover:bg-white/10 hover:text-white">
          {t("admin.nav.renderAnalytics")}
        </Link>
        <Link href="/admin/ai-lab/replicate" className="rounded-full px-3 py-1 hover:bg-white/10 hover:text-white">
          {t("admin.nav.aiLabReplicate")}
        </Link>
      </nav>
      <div className={studioVisual.editorSurface}>{children}</div>
    </ProductPageShell>
  );
}
