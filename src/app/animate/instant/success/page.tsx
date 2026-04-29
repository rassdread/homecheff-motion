"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { brand } from "@/lib/brand";

export default function InstantPremiumSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Confirming payment…");

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id")?.trim();
    if (!sessionId) {
      queueMicrotask(() => {
        setStatus("error");
        setMessage("Missing session. Return from Stripe checkout or contact support.");
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
          setMessage(data.error ?? "Could not complete your order.");
          return;
        }
        setStatus("done");
        setMessage(
          data.warning
            ? `Project ready. ${data.warning} You can start generation from My Videos if needed.`
            : "Payment confirmed. Opening progress…"
        );
        router.replace(`/animate?resume=${encodeURIComponent(data.projectId)}`);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Network error while confirming payment.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className={`min-h-screen flex-1 ${brand.softGradientBg}`}>
      <div className="mx-auto w-full max-w-lg px-4 py-16">
        <AppCard>
          <h1 className="text-xl font-semibold">
            {status === "error" ? "Something went wrong" : "Instant Premium"}
          </h1>
          <p className="mt-3 text-sm text-zinc-600">{message}</p>
          {status === "working" ? (
            <div className="mt-6 h-2 w-full animate-pulse rounded-full bg-emerald-100" aria-hidden />
          ) : null}
          {status === "error" ? (
            <div className="mt-6 flex flex-col gap-3">
              <GradientButton href="/animate/instant">Back to wizard</GradientButton>
              <Link href="/videos" className="text-center text-sm text-emerald-800 underline">
                My videos
              </Link>
            </div>
          ) : null}
        </AppCard>
      </div>
    </main>
  );
}
