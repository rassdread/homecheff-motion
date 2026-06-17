import Link from "next/link";
import { ReactNode } from "react";
import { HomeCheffAssistantMount } from "@/components/assistant/homecheff-assistant-mount";
import { AppShellPrimaryNav } from "@/components/layout/app-shell-primary-nav";
import { AppShellUserBar } from "@/components/layout/app-shell-user-bar";
import { BillingConversionShell } from "@/components/billing/billing-conversion-shell";
import { GlobalCreditIndicator } from "@/components/billing/global-credit-indicator";
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
    <div data-route-shell="app-shell">
      <I18nHydrationSync />
      <I18nHtmlLangSync />
      <header className={`${studioVisual.header} studio-header-glow`}>
        <nav className={`${studioVisual.headerInner} items-center`}>
          <div className="flex min-w-0 items-center">
            <Link href="/" prefetch={false} className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <div className={studioVisual.logoMark}>
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${brand.accentGradient} opacity-95`}
                />
              </div>
              <span className={studioVisual.logoText}>{brand.studioProductName}</span>
            </Link>
          </div>

          <div className="hidden min-w-0 justify-center overflow-x-auto lg:flex lg:px-1">
            <AppShellPrimaryNav variant="desktop" />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageSwitch />
            <GlobalCreditIndicator />
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
      <BillingConversionShell />
      <div className="flex min-w-0 w-full flex-col overflow-visible">
        <HomeCheffAssistantMount>{children}</HomeCheffAssistantMount>
      </div>
    </div>
  );
}
