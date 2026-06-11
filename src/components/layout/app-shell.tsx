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
        <nav className={`${studioVisual.headerInner} !flex-col gap-3 lg:!flex-row lg:!items-center`}>
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/" prefetch={false} className="flex shrink-0 items-center gap-3">
                <div className={studioVisual.logoMark}>
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${brand.accentGradient} opacity-95`}
                  />
                </div>
                <span className={studioVisual.logoText}>{brand.studioProductName}</span>
              </Link>
              <LanguageSwitch />
            </div>
            <div className="hidden shrink-0 lg:block">
              <AppShellUserBar />
            </div>
          </div>

          <div className="hidden w-full justify-center lg:flex lg:flex-1">
            <AppShellPrimaryNav variant="desktop" />
          </div>

          <div className="w-full lg:hidden">
            <AppShellPrimaryNav variant="mobile" />
            <div className="mt-3 border-t border-white/10 pt-3">
              <AppShellUserBar />
            </div>
          </div>
        </nav>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </>
  );
}
