import Link from "next/link";
import { ReactNode } from "react";
import { AppShellPrimaryNav } from "@/components/layout/app-shell-primary-nav";
import { AppShellUserBar } from "@/components/layout/app-shell-user-bar";
import { I18nHydrationSync } from "@/components/layout/i18n-hydration-sync";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { brand } from "@/lib/brand";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <I18nHydrationSync />
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white backface-hidden [transform:translateZ(0)]">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <Link href="/" prefetch={false} className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-emerald-100 bg-white">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${brand.accentGradient} opacity-90`}
              />
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-900">
              {brand.productName}
            </span>
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
            <LanguageSwitch />
            <AppShellPrimaryNav />
            <AppShellUserBar />
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}
