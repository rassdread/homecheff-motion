import type { Metadata } from "next";
import { ReactNode } from "react";
import { StudioAccountNav } from "@/components/account/studio-account-nav";
import { ProductPageShell } from "@/components/layout/product-page-shell";
import { getActiveTranslator } from "@/i18n";
import { buildNoIndexMetadata, buildPageMetadata } from "@/lib/seo/site-metadata";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { getAuthenticatedUser } from "@/server/auth/session";
import { redirectUnauthenticatedPrivate } from "@/lib/identity/sso/private-entry";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Account",
    description: "Manage your HomeCheff Studio account, billing, and settings.",
    path: "/account",
  }),
  ...buildNoIndexMetadata(),
};

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    await redirectUnauthenticatedPrivate("/account");
  }

  const t = await getActiveTranslator();

  return (
    <ProductPageShell>
      <p className={studioVisual.eyebrowOnDark}>{t("account.label")}</p>
      <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{t("account.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">{t("account.intro")}</p>
      <div className="mt-6">
        <StudioAccountNav />
      </div>
      <div className="mt-6">{children}</div>
    </ProductPageShell>
  );
}
