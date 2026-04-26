"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveTranslator } from "@/i18n";

export function AdminNavLink() {
  const t = getActiveTranslator();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok || cancelled) {
          return;
        }
        const data = (await res.json()) as { user: { role: string } | null };
        if (data.user?.role === "admin") {
          setShow(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) {
    return null;
  }

  return (
    <Link
      href="/admin"
      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900"
    >
      {t("admin.nav.link")}
    </Link>
  );
}
