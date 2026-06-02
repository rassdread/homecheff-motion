"use client";

import Link from "next/link";
import { OcrHealthCard } from "@/components/admin/ocr-health-card";
import { VisionHealthCard } from "@/components/admin/vision-health-card";
import { VideoCreditsCard } from "@/components/admin/video-credits-card";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";

export default function AdminDashboardPage() {
  const t = useActiveTranslator();

  return (
    <main>
      <h1 className="text-2xl font-semibold text-zinc-900">{t("admin.dashboard.title")}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t("admin.dashboard.intro")}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <VideoCreditsCard />
        <OcrHealthCard />
        <VisionHealthCard />
        <AppCard>
          <h2 className="text-lg font-semibold">{t("admin.nav.invites")}</h2>
          <p className="mt-2 text-sm text-zinc-600">{t("admin.invites.intro")}</p>
          <Link
            href="/admin/invites"
            className="mt-4 inline-block text-sm font-medium text-emerald-700 underline"
          >
            {t("admin.nav.invites")} →
          </Link>
        </AppCard>
        <AppCard>
          <h2 className="text-lg font-semibold">{t("admin.nav.users")}</h2>
          <p className="mt-2 text-sm text-zinc-600">{t("admin.users.intro")}</p>
          <Link
            href="/admin/users"
            className="mt-4 inline-block text-sm font-medium text-emerald-700 underline"
          >
            {t("admin.nav.users")} →
          </Link>
        </AppCard>
      </div>
    </main>
  );
}
