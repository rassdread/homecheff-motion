"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { HomeCheffBrandMark } from "@/components/brand/homecheff-brand-mark";
import { HomeCheffAssistantMount } from "@/components/assistant/homecheff-assistant-mount";
import { OntdekHomeCheffShellControl } from "@/components/ecosystem/ontdek-homecheff-shell-control";
import { AppShellPrimaryNav } from "@/components/layout/app-shell-primary-nav";
import { AppShellUserBar } from "@/components/layout/app-shell-user-bar";
import { BillingConversionShell } from "@/components/billing/billing-conversion-shell";
import { GlobalCreditIndicator } from "@/components/billing/global-credit-indicator";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { brand } from "@/lib/brand";
import { isPx4aItemCreatorPath, isPx4aStandaloneCreatorPath } from "@/lib/photo-video/item-handoff";
import { studioVisual } from "@/lib/studio-visual-tokens";

export function AppShellChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const itemJourney = isPx4aItemCreatorPath(pathname);
  const standaloneCreator = isPx4aStandaloneCreatorPath(pathname);

  if (itemJourney) {
    return (
      <>
        <header className={`${studioVisual.header} studio-header-glow`} data-testid="px4a-item-shell">
          <nav className={`${studioVisual.headerInner} items-center`}>
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <HomeCheffBrandMark priority />
              <span className={studioVisual.logoText}>{brand.studioProductName}</span>
            </div>
            <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
              <LanguageSwitch />
            </div>
          </nav>
        </header>
        <div className="flex min-w-0 w-full flex-col overflow-visible">{children}</div>
      </>
    );
  }

  return (
    <>
      <header className={`${studioVisual.header} studio-header-glow`}>
        <nav className={`${studioVisual.headerInner} items-center`}>
          <div className="flex min-w-0 items-center">
            <Link href="/" prefetch={false} className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <HomeCheffBrandMark priority />
              <span className={studioVisual.logoText}>{brand.studioProductName}</span>
            </Link>
          </div>

          <div className="hidden min-w-0 justify-center overflow-x-auto lg:flex lg:px-1">
            <AppShellPrimaryNav variant="desktop" />
          </div>

          <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            <OntdekHomeCheffShellControl />
            <LanguageSwitch />
            {standaloneCreator ? null : <GlobalCreditIndicator />}
            <div className="hidden lg:block">
              <AppShellUserBar />
            </div>
            <div className="relative flex min-w-0 items-center gap-1 lg:hidden">
              <AppShellUserBar compact />
              <AppShellPrimaryNav variant="mobile" />
            </div>
          </div>
        </nav>
      </header>
      {standaloneCreator ? null : <BillingConversionShell />}
      <div className="flex min-w-0 w-full flex-col overflow-visible">
        <HomeCheffAssistantMount>{children}</HomeCheffAssistantMount>
      </div>
    </>
  );
}
