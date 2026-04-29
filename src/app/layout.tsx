import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { getInstantPremiumMode } from "@/lib/instant-premium-mode";
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

export const metadata: Metadata = {
  title: "HomeCheff Motion",
  description: "Turn photos into flowing AI animations in HomeCheff style.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const instantPremiumMode = getInstantPremiumMode();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        data-instant-premium-mode={instantPremiumMode}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
