import { ReactNode, Suspense } from "react";
import { AppShellChrome } from "@/components/layout/app-shell-chrome";
import { I18nHtmlLangSync } from "@/components/layout/i18n-html-lang-sync";
import { I18nHydrationSync } from "@/components/layout/i18n-hydration-sync";
import { StudioSessionIdentityGuard } from "@/components/identity/studio-session-identity-guard";
import { StudioAffiliateReferralBinder } from "@/components/affiliate/studio-affiliate-referral-binder";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <StudioSessionIdentityGuard>
      <div data-route-shell="app-shell" className="hc-viewport-width min-w-0 overflow-x-clip">
        <I18nHydrationSync />
        <I18nHtmlLangSync />
        <Suspense fallback={null}>
          <StudioAffiliateReferralBinder />
        </Suspense>
        <div className="flex min-w-0 w-full flex-col overflow-visible">
          <AppShellChrome>{children}</AppShellChrome>
        </div>
      </div>
    </StudioSessionIdentityGuard>
  );
}
