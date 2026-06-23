import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { JsonLd } from "@/components/seo/json-ld";
import { AppShell } from "@/components/layout/app-shell";
import { getInstantPremiumMode } from "@/lib/instant-premium-mode";
import { HOMECHEFF_BRAND_ICON_PATHS } from "@/lib/homecheff-brand-icon";
import {
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo/structured-data";
import { ROOT_SITE_METADATA } from "@/lib/seo/site-metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  /** Mono is only used in a few spots; preloading it competes with video on /videos (Safari warns). */
  preload: false,
});

export const metadata: Metadata = ROOT_SITE_METADATA;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const instantPremiumMode = getInstantPremiumMode();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased`}
    >
      <head>
        {/* Safari reads favicon from initial HTML only — no JS updates (WebKit #75877). */}
        <link
          rel="shortcut icon"
          type="image/png"
          sizes="32x32"
          href={HOMECHEFF_BRAND_ICON_PATHS.favicon32}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href={HOMECHEFF_BRAND_ICON_PATHS.favicon32}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href={HOMECHEFF_BRAND_ICON_PATHS.favicon16}
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          type="image/png"
          href={HOMECHEFF_BRAND_ICON_PATHS.appleTouchIcon}
        />
      </head>
      <body
        className="flex min-h-full flex-col overflow-x-hidden overflow-y-visible"
        data-instant-premium-mode={instantPremiumMode}
      >
        <JsonLd
          data={[
            buildOrganizationJsonLd(),
            buildWebSiteJsonLd(),
            buildSoftwareApplicationJsonLd(),
          ]}
        />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
