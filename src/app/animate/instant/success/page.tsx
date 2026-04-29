"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";

export default function InstantPremiumSuccessPage() {
  const router = useRouter();
  const t = useActiveTranslator();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState(t("instant.success.confirming"));

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id")?.trim();
    if (!sessionId) {
      queueMicrotask(() => {
        setStatus("error");
        setMessage(t("instant.success.missingSession"));
      });
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/instant-premium/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sessionId }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          projectId?: string;
          error?: string;
          warning?: string;
          jobsStarted?: boolean;
        };
        if (cancelled) {
          return;
        }
        if (!res.ok || !data.projectId) {
          setStatus("error");
          setMessage(data.error ?? t("instant.success.completeFailed"));
          return;
        }
        setStatus("done");
        setMessage(
          data.warning
            ? `${t("instant.success.projectReady")} ${data.warning} ${t("instant.success.myVideosHint")}`
            : t("instant.success.paymentConfirmed")
        );
        router.replace(`/animate?resume=${encodeURIComponent(data.projectId)}`);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage(t("instant.success.networkError"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, t]);

  return (
    <main className={`min-h-screen flex-1 ${brand.softGradientBg}`}>
      <div className="mx-auto w-full max-w-lg px-4 py-16">
        <AppCard>
          <h1 className="text-xl font-semibold">
            {status === "error" ? t("instant.success.errorTitle") : t("instant.title")}
          </h1>
          <p className="mt-3 text-sm text-zinc-600">{message}</p>
          {status === "working" ? (
            <div className="mt-6 h-2 w-full animate-pulse rounded-full bg-emerald-100" aria-hidden />
          ) : null}
          {status === "error" ? (
            <div className="mt-6 flex flex-col gap-3">
              <GradientButton href="/animate/instant">{t("instant.success.backToWizard")}</GradientButton>
              <Link href="/videos" className="text-center text-sm text-emerald-800 underline">
                {t("nav.myVideos")}
              </Link>
            </div>
          ) : null}
        </AppCard>
      </div>
    </main>
  );
}
