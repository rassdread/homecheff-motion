"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveTranslator } from "@/i18n/client";

const LINKS = [
  { href: "/account", key: "account.nav.overview" },
  { href: "/account/credits", key: "account.nav.credits" },
  { href: "/account/billing", key: "account.nav.billing" },
  { href: "/account/usage", key: "account.nav.usage" },
  { href: "/account/settings", key: "account.nav.settings" },
] as const;

export function StudioAccountNav() {
  const pathname = usePathname();
  const t = useActiveTranslator();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-white/15 text-white"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {t(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}
