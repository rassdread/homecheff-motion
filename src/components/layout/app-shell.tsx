import Link from "next/link";
import { ReactNode } from "react";
import { AppShellPrimaryNav } from "@/components/layout/app-shell-primary-nav";
import { AppShellUserBar } from "@/components/layout/app-shell-user-bar";
import { I18nHtmlLangSync } from "@/components/layout/i18n-html-lang-sync";
import { I18nHydrationSync } from "@/components/layout/i18n-hydration-sync";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { brand } from "@/lib/brand";
import { studioVisual } from "@/lib/studio-visual-tokens";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <I18nHydrationSync />
      <I18nHtmlLangSync />
      <header className={`${studioVisual.header} studio-header-glow`}>
        <nav className={`${studioVisual.headerInner} relative !flex !flex-row !items-center`}>
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Link href="/" prefetch={false} className="flex shrink-0 items-center gap-2.5">
              <div className={studioVisual.logoMark}>
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${brand.accentGradient} opacity-95`}
                />
              </div>
              <span className={studioVisual.logoText}>{brand.studioProductName}</span>
            </Link>
            <LanguageSwitch />
          </div>

          <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 lg:block">
            <div className="pointer-events-auto">
              <AppShellPrimaryNav variant="desktop" />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden lg:block">
              <AppShellUserBar />
            </div>
            <div className="relative flex items-center gap-2 lg:hidden">
              <AppShellUserBar />
              <AppShellPrimaryNav variant="mobile" />
            </div>
          </div>
        </nav>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </>
  );
}
