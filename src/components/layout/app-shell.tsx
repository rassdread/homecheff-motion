import Link from "next/link";
import { ReactNode } from "react";
import { getActiveTranslator } from "@/i18n";
import { brand } from "@/lib/brand";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const t = getActiveTranslator();

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-emerald-100/80 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-emerald-100 bg-white">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${brand.accentGradient} opacity-90`}
              />
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-900">
              {brand.productName}
            </span>
          </Link>
          <Link
            href="/animate"
            className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-emerald-50"
          >
            {t("nav.create")}
          </Link>
        </nav>
      </header>
      {children}
    </>
  );
}
